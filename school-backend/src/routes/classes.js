import { Router } from 'express';
import { query } from '../db.js';

export const classesRouter = Router();

classesRouter.get('/', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT c.*, COUNT(s.id) FILTER (WHERE s.is_active)::int AS student_count
       FROM sc_classes c
       LEFT JOIN sc_students s ON s.class_id = c.id
       WHERE c.is_active
       GROUP BY c.id ORDER BY c.name`
    );
    res.json({ data: r.rows });
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
    const { name, branch, class_teacher } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Class name is required' });
    const r = await query(
      `INSERT INTO sc_classes (name, branch, class_teacher) VALUES ($1,$2,$3) RETURNING *`,
      [name.trim(), branch || null, class_teacher || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

classesRouter.put('/:id', async (req, res, next) => {
  try {
    const { name, branch, class_teacher } = req.body;
    const r = await query(
      `UPDATE sc_classes SET name=$1, branch=$2, class_teacher=$3 WHERE id=$4 RETURNING *`,
      [name, branch || null, class_teacher || null, Number(req.params.id)]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Class not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});
