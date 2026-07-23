import { Router } from 'express';
import { query } from '../db.js';

export const classAttendanceRouter = Router();

// List summaries — supports ?date=, ?from=&to=, ?class_id=
classAttendanceRouter.get('/', async (req, res) => {
  try {
    const { date, from, to, class_id } = req.query;
    const params = [];
    const conds = [];

    if (date)     { params.push(date); conds.push(`s.attendance_date = $${params.length}`); }
    if (from)     { params.push(from); conds.push(`s.attendance_date >= $${params.length}`); }
    if (to)       { params.push(to);   conds.push(`s.attendance_date <= $${params.length}`); }
    if (class_id) { params.push(class_id); conds.push(`s.class_id = $${params.length}`); }

    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const { rows } = await query(`
      SELECT s.id, s.class_id, c.name AS class_name, c.branch,
             s.attendance_date, s.total_students, s.attended,
             s.absent, s.absent_percent, s.notes, s.recorded_by, s.created_at
      FROM sc_class_attendance_summary s
      JOIN sc_classes c ON c.id = s.class_id
      ${where}
      ORDER BY s.attendance_date DESC, c.name
    `, params);
    res.json({ data: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Upsert a class summary entry
classAttendanceRouter.post('/', async (req, res) => {
  try {
    const { class_id, attendance_date, total_students, attended, notes } = req.body;
    if (!class_id || !attendance_date) return res.status(400).json({ message: 'class_id and attendance_date are required' });
    if (total_students == null || attended == null) return res.status(400).json({ message: 'total_students and attended are required' });

    const recorded_by = req.user?.full_name ?? req.user?.username ?? null;
    const { rows } = await query(`
      INSERT INTO sc_class_attendance_summary
        (class_id, attendance_date, total_students, attended, notes, recorded_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (class_id, attendance_date) DO UPDATE SET
        total_students = EXCLUDED.total_students,
        attended       = EXCLUDED.attended,
        notes          = EXCLUDED.notes,
        recorded_by    = EXCLUDED.recorded_by,
        updated_at     = NOW()
      RETURNING *
    `, [class_id, attendance_date, total_students, attended, notes ?? null, recorded_by]);

    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Delete a summary entry
classAttendanceRouter.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM sc_class_attendance_summary WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
