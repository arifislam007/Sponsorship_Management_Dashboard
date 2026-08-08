import { Router } from 'express';
import { query } from '../db.js';

// Self-service: any authenticated employee (login / logout / today)
export const attendanceSelfRouter = Router();

// Admin: HR module access required (list / report / link)
export const attendanceAdminRouter = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function getClientIp(req) {
  // Browser sends its WebRTC-detected LAN IP in the body — most accurate for Docker setups
  const bodyIp = req.body?.client_ip;
  if (bodyIp && /^[\d.:a-fA-F]+$/.test(bodyIp) && bodyIp !== '0.0.0.0') return bodyIp;
  // Fallback: nginx X-Real-IP header
  return (
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

async function findEmployee(userId) {
  const byLink = await query(
    `SELECT * FROM hr_employees WHERE linked_user_id = $1 AND NOT is_deleted LIMIT 1`,
    [userId]
  );
  if (byLink.rows.length) return byLink.rows[0];

  const byEmail = await query(
    `SELECT e.* FROM hr_employees e
     JOIN users u ON LOWER(u.email) = LOWER(e.email)
     WHERE u.id = $1 AND NOT e.is_deleted LIMIT 1`,
    [userId]
  );
  return byEmail.rows[0] || null;
}

function calcStatus(firstLoginTime, totalMinutes) {
  // Determine if the first login was late (after 09:15)
  const d = new Date(firstLoginTime);
  const late = d.getHours() > 9 || (d.getHours() === 9 && d.getMinutes() > 15);

  if (totalMinutes >= 480) return late ? 'Late' : 'Present';
  if (totalMinutes >= 120) return late ? 'Late' : 'Half-Day';
  return 'Incomplete';
}

function fmtDuration(mins) {
  if (!mins) return '0h 0m';
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ── Today status ──────────────────────────────────────────────────────────────

attendanceSelfRouter.get('/today', async (req, res, next) => {
  try {
    const emp = await findEmployee(req.user.userId);
    if (!emp) return res.json({ mapped: false });

    const today = new Date().toISOString().slice(0, 10);
    const r = await query(
      `SELECT * FROM hr_attendance WHERE employee_id = $1 AND date = $2`,
      [emp.id, today]
    );
    res.json({
      mapped: true,
      employee: { id: emp.id, full_name: emp.full_name, employee_code: emp.employee_code },
      record: r.rows[0] || null,
    });
  } catch (err) { next(err); }
});

// ── Login ─────────────────────────────────────────────────────────────────────

attendanceSelfRouter.post('/login', async (req, res, next) => {
  try {
    const emp = await findEmployee(req.user.userId);
    if (!emp) return res.status(400).json({ message: 'Your account is not linked to an employee profile. Ask HR to link your account.' });

    const today = new Date().toISOString().slice(0, 10);
    const ip    = getClientIp(req);

    const existing = await query(
      `SELECT * FROM hr_attendance WHERE employee_id = $1 AND date = $2`,
      [emp.id, today]
    );

    let record;

    if (!existing.rows.length) {
      // First login of the day
      const r = await query(
        `INSERT INTO hr_attendance
           (employee_id, user_id, date, login_time, current_login, login_ip, is_active, working_minutes, session_count)
         VALUES ($1, $2, $3, NOW(), NOW(), $4, true, 0, 1) RETURNING *`,
        [emp.id, req.user.userId, today, ip]
      );
      record = r.rows[0];
    } else {
      const row = existing.rows[0];
      if (row.is_active) {
        return res.status(400).json({ message: 'You are already logged in. Please logout first.' });
      }
      // Subsequent session — update current_login, clear logout, increment count
      const r = await query(
        `UPDATE hr_attendance
         SET current_login = NOW(), is_active = true,
             session_count = session_count + 1, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [row.id]
      );
      record = r.rows[0];
    }

    res.json({
      ok: true,
      record,
      employee: { full_name: emp.full_name, employee_code: emp.employee_code },
      device_ip: ip,
    });
  } catch (err) { next(err); }
});

// ── Logout ────────────────────────────────────────────────────────────────────

attendanceSelfRouter.post('/logout', async (req, res, next) => {
  try {
    const emp = await findEmployee(req.user.userId);
    if (!emp) return res.status(400).json({ message: 'Account not linked to an employee profile.' });

    const today = new Date().toISOString().slice(0, 10);
    const ip    = getClientIp(req);

    const existing = await query(
      `SELECT * FROM hr_attendance WHERE employee_id = $1 AND date = $2 AND is_active = true`,
      [emp.id, today]
    );
    if (!existing.rows.length) {
      return res.status(400).json({ message: 'No active session found. Please login first.' });
    }

    const row = existing.rows[0];
    const sessionMinutes  = Math.floor((Date.now() - new Date(row.current_login).getTime()) / 60000);
    const totalMinutes    = (row.working_minutes || 0) + sessionMinutes;
    const status          = calcStatus(row.login_time, totalMinutes);

    const r = await query(
      `UPDATE hr_attendance
       SET is_active = false, logout_time = NOW(), logout_ip = $1,
           working_minutes = $2, status = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [ip, totalMinutes, status, row.id]
    );

    res.json({ ok: true, record: r.rows[0], duration: fmtDuration(totalMinutes), device_ip: ip });
  } catch (err) { next(err); }
});

// ── Admin list ────────────────────────────────────────────────────────────────

attendanceAdminRouter.get('/', async (req, res, next) => {
  try {
    const { from_date, to_date, employee_id, department_id, status, search, limit = 50, offset = 0 } = req.query;

    const params  = [];
    const clauses = [];

    if (from_date)     { params.push(from_date);             clauses.push(`a.date >= $${params.length}`); }
    if (to_date)       { params.push(to_date);               clauses.push(`a.date <= $${params.length}`); }
    if (employee_id)   { params.push(Number(employee_id));   clauses.push(`a.employee_id = $${params.length}`); }
    if (department_id) { params.push(Number(department_id)); clauses.push(`e.department_id = $${params.length}`); }
    if (status)        { params.push(status);                clauses.push(`a.status = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(e.full_name ILIKE $${params.length} OR e.employee_code ILIKE $${params.length})`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const [dataR, countR] = await Promise.all([
      query(
        `SELECT a.*, e.full_name, e.employee_code, d.name AS department_name
         FROM hr_attendance a
         JOIN hr_employees e ON e.id = a.employee_id
         LEFT JOIN hr_departments d ON d.id = e.department_id
         ${where}
         ORDER BY a.date DESC, a.login_time DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, Number(limit), Number(offset)]
      ),
      query(
        `SELECT COUNT(*)::int AS total
         FROM hr_attendance a
         JOIN hr_employees e ON e.id = a.employee_id
         LEFT JOIN hr_departments d ON d.id = e.department_id
         ${where}`,
        params
      ),
    ]);

    res.json({ data: dataR.rows, total: countR.rows[0].total });
  } catch (err) { next(err); }
});

// ── Monthly summary ───────────────────────────────────────────────────────────

attendanceAdminRouter.get('/report/monthly', async (req, res, next) => {
  try {
    const { year, month, department_id } = req.query;
    const y = Number(year)  || new Date().getFullYear();
    const m = Number(month) || (new Date().getMonth() + 1);

    const params = [y, m];
    const deptFilter = department_id ? `AND e.department_id = $${params.push(Number(department_id))}` : '';

    const r = await query(
      `SELECT
         e.id AS employee_id, e.employee_code, e.full_name, d.name AS department_name,
         COUNT(a.id)::int                                                      AS total_days,
         COUNT(a.id) FILTER (WHERE a.status = 'Present')::int                 AS present_days,
         COUNT(a.id) FILTER (WHERE a.status = 'Late')::int                    AS late_days,
         COUNT(a.id) FILTER (WHERE a.status = 'Half-Day')::int                AS half_days,
         COUNT(a.id) FILTER (WHERE a.status = 'Incomplete')::int              AS incomplete_days,
         COALESCE(SUM(a.working_minutes), 0)::int                             AS total_minutes,
         COALESCE(SUM(a.session_count), 0)::int                               AS total_sessions
       FROM hr_employees e
       LEFT JOIN hr_attendance a
         ON a.employee_id = e.id
        AND EXTRACT(YEAR  FROM a.date) = $1
        AND EXTRACT(MONTH FROM a.date) = $2
       LEFT JOIN hr_departments d ON d.id = e.department_id
       WHERE NOT e.is_deleted ${deptFilter}
       GROUP BY e.id, e.employee_code, e.full_name, d.name
       ORDER BY e.full_name`,
      params
    );

    res.json({ data: r.rows, year: y, month: m });
  } catch (err) { next(err); }
});

// ── Link user → employee (admin) ──────────────────────────────────────────────

attendanceAdminRouter.post('/link', async (req, res, next) => {
  try {
    const { employee_id, user_id } = req.body;
    if (!employee_id || !user_id) return res.status(400).json({ message: 'employee_id and user_id required' });
    await query(`UPDATE hr_employees SET linked_user_id = $1 WHERE id = $2`, [user_id, employee_id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

attendanceAdminRouter.delete('/link/:employee_id', async (req, res, next) => {
  try {
    await query(`UPDATE hr_employees SET linked_user_id = NULL WHERE id = $1`, [req.params.employee_id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});
