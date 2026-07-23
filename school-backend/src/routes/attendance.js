import { Router } from 'express';
import { query } from '../db.js';

export const attendanceRouter = Router();

// Get attendance for a class + date (returns students list with status)
attendanceRouter.get('/', async (req, res, next) => {
  try {
    const { class_id, date, from_date, to_date } = req.query;

    if (class_id && date) {
      // Single day view — return all students with their status
      const r = await query(
        `SELECT s.id AS student_id, s.full_name, s.student_code,
                COALESCE(a.status, 'Absent') AS status, a.notes, a.id AS attendance_id
         FROM sc_students s
         LEFT JOIN sc_attendance a ON a.student_id = s.id AND a.class_id = $1 AND a.attendance_date = $2
         WHERE s.class_id = $1 AND s.is_active
         ORDER BY s.full_name`,
        [Number(class_id), date]
      );
      return res.json({ data: r.rows });
    }

    if (from_date && to_date) {
      const classClause = class_id ? `AND a.class_id = ${Number(class_id)}` : '';
      const r = await query(
        `SELECT a.attendance_date, a.class_id, c.name AS class_name,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE a.status = 'Present')::int AS present,
                COUNT(*) FILTER (WHERE a.status = 'Absent')::int AS absent,
                COUNT(*) FILTER (WHERE a.status = 'Late')::int AS late,
                ROUND(COUNT(*) FILTER (WHERE a.status = 'Present')::decimal / COUNT(*) * 100, 1) AS pct
         FROM sc_attendance a
         JOIN sc_classes c ON c.id = a.class_id
         WHERE a.attendance_date BETWEEN $1 AND $2 ${classClause}
         GROUP BY a.attendance_date, a.class_id, c.name
         ORDER BY a.attendance_date DESC`,
        [from_date, to_date]
      );
      return res.json({ data: r.rows });
    }

    res.status(400).json({ message: 'Provide class_id+date or from_date+to_date' });
  } catch (err) { next(err); }
});

// Bulk save attendance for a class+date
attendanceRouter.post('/bulk', async (req, res, next) => {
  try {
    const { class_id, attendance_date, records } = req.body;
    if (!class_id || !attendance_date || !Array.isArray(records)) {
      return res.status(400).json({ message: 'class_id, attendance_date, and records[] are required' });
    }
    const recorded_by = req.user?.username || 'System';

    for (const rec of records) {
      await query(
        `INSERT INTO sc_attendance (class_id, attendance_date, student_id, status, notes, recorded_by)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (class_id, attendance_date, student_id)
         DO UPDATE SET status=$4, notes=$5, recorded_by=$6, updated_at=CURRENT_TIMESTAMP`,
        [Number(class_id), attendance_date, Number(rec.student_id),
         rec.status || 'Absent', rec.notes || null, recorded_by]
      );
    }

    res.json({ message: `Saved attendance for ${records.length} students` });
  } catch (err) { next(err); }
});

// Monthly summary per student
attendanceRouter.get('/monthly', async (req, res, next) => {
  try {
    const { class_id, month } = req.query;
    if (!class_id || !month) return res.status(400).json({ message: 'class_id and month required' });

    const [y, m] = month.split('-');
    const from = `${y}-${m}-01`;
    const to = new Date(Number(y), Number(m), 0).toISOString().slice(0, 10);

    const r = await query(
      `SELECT s.id, s.full_name, s.student_code,
              COUNT(a.id)::int AS total_days,
              COUNT(*) FILTER (WHERE a.status = 'Present')::int AS present,
              COUNT(*) FILTER (WHERE a.status = 'Absent')::int AS absent,
              COUNT(*) FILTER (WHERE a.status = 'Late')::int AS late,
              ROUND(COUNT(*) FILTER (WHERE a.status IN ('Present','Late'))::decimal
                / NULLIF(COUNT(a.id), 0) * 100, 1) AS pct
       FROM sc_students s
       LEFT JOIN sc_attendance a ON a.student_id = s.id AND a.attendance_date BETWEEN $1 AND $2
       WHERE s.class_id = $3 AND s.is_active
       GROUP BY s.id, s.full_name, s.student_code
       ORDER BY s.full_name`,
      [from, to, Number(class_id)]
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});
