import { Router } from 'express';
import { query } from '../db.js';

export const coursesRouter = Router();

coursesRouter.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, COUNT(l.id)::int AS lead_count
       FROM lead_courses c
       LEFT JOIN lead_leads l ON l.course_id = c.id
       GROUP BY c.id
       ORDER BY c.name`
    );
    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

coursesRouter.post('/', async (req, res, next) => {
  try {
    const { name, code, duration_months, fee } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Course name is required' });
    const r = await query(
      `INSERT INTO lead_courses (name, code, duration_months, fee)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), code?.trim() || null, duration_months || null, fee || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

coursesRouter.put('/:id', async (req, res, next) => {
  try {
    const { name, code, duration_months, fee, is_active } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Course name is required' });
    const r = await query(
      `UPDATE lead_courses SET name=$1, code=$2, duration_months=$3, fee=$4, is_active=$5
       WHERE id=$6 RETURNING *`,
      [name.trim(), code?.trim() || null, duration_months || null, fee || null,
       is_active !== false, Number(req.params.id)]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Course not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

coursesRouter.delete('/:id', async (req, res, next) => {
  try {
    const check = await query('SELECT COUNT(*)::int AS cnt FROM lead_leads WHERE course_id=$1', [Number(req.params.id)]);
    if (check.rows[0].cnt > 0)
      return res.status(400).json({ message: 'Cannot delete a course with leads assigned to it' });
    await query('DELETE FROM lead_courses WHERE id=$1', [Number(req.params.id)]);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});
