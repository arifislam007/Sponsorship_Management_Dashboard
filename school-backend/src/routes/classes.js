import { Router } from 'express';
import { query } from '../db.js';

export const classesRouter = Router();

classesRouter.get('/', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT c.*, cr.name AS classroom_name, cr.capacity AS classroom_capacity, COUNT(s.id) FILTER (WHERE s.is_active)::int AS student_count
       FROM sc_classes c
       LEFT JOIN sc_students s ON s.class_id = c.id
       LEFT JOIN sc_classrooms cr ON cr.id = c.classroom_id
       WHERE c.is_active
       GROUP BY c.id, cr.name, cr.capacity ORDER BY c.name`
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

classesRouter.patch('/:id/tiffin', async (req, res, next) => {
  try {
    const { tiffin_after_period, tiffin_start_time, tiffin_end_time } = req.body || {};
    const r = await query(
      `UPDATE sc_classes SET tiffin_after_period=$1, tiffin_start_time=$2, tiffin_end_time=$3 WHERE id=$4 RETURNING *`,
      [tiffin_after_period ? Number(tiffin_after_period) : null, tiffin_start_time || null, tiffin_end_time || null, Number(req.params.id)]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Class not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

classesRouter.patch('/:id/period-count', async (req, res, next) => {
  try {
    const { period_count } = req.body || {};
    const count = Number(period_count);
    if (!count || count < 1) return res.status(400).json({ message: 'period_count must be at least 1' });
    const r = await query(
      `UPDATE sc_classes SET period_count=$1 WHERE id=$2 RETURNING *`,
      [count, Number(req.params.id)]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Class not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

classesRouter.patch('/:id/shift', async (req, res, next) => {
  try {
    const { shift } = req.body || {};
    if (!['Morning', 'Day'].includes(shift)) return res.status(400).json({ message: "shift must be 'Morning' or 'Day'" });
    const r = await query(
      `UPDATE sc_classes SET shift=$1 WHERE id=$2 RETURNING *`,
      [shift, Number(req.params.id)]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Class not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

classesRouter.patch('/:id/total-students', async (req, res, next) => {
  try {
    const { total_students } = req.body;
    if (total_students == null) return res.status(400).json({ message: 'total_students is required' });
    const r = await query(
      `UPDATE sc_classes SET total_students=$1 WHERE id=$2 RETURNING id, name, total_students`,
      [Number(total_students), Number(req.params.id)]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Class not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

classesRouter.post('/', async (req, res, next) => {
  try {
    const { name, branch, class_teacher, classroom_id, shift } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Class name is required' });
    const r = await query(
      `INSERT INTO sc_classes (name, branch, class_teacher, classroom_id, shift) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name.trim(), branch || null, class_teacher || null, classroom_id ? Number(classroom_id) : null, ['Morning', 'Day'].includes(shift) ? shift : 'Morning']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

classesRouter.put('/:id', async (req, res, next) => {
  try {
    const { name, branch, class_teacher, classroom_id, shift } = req.body;
    const r = await query(
      `UPDATE sc_classes SET name=$1, branch=$2, class_teacher=$3, classroom_id=$4, shift=COALESCE($5, shift) WHERE id=$6 RETURNING *`,
      [name, branch || null, class_teacher || null, classroom_id ? Number(classroom_id) : null, ['Morning', 'Day'].includes(shift) ? shift : null, Number(req.params.id)]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Class not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});
