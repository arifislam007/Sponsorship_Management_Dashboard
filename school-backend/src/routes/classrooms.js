import { Router } from 'express';
import { query } from '../db.js';

export const classroomsRouter = Router();

classroomsRouter.get('/', async (req, res, next) => {
  try {
    const r = await query(`SELECT * FROM sc_classrooms WHERE is_active ORDER BY name`);
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

classroomsRouter.post('/', async (req, res, next) => {
  try {
    const { name, capacity } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Classroom name is required' });
    const r = await query(
      `INSERT INTO sc_classrooms (name, capacity) VALUES ($1,$2) RETURNING *`,
      [name.trim(), capacity ? Number(capacity) : null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'That classroom already exists' });
    next(err);
  }
});

classroomsRouter.put('/:id', async (req, res, next) => {
  try {
    const { name, capacity } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Classroom name is required' });
    const r = await query(
      `UPDATE sc_classrooms SET name=$1, capacity=$2 WHERE id=$3 RETURNING *`,
      [name.trim(), capacity ? Number(capacity) : null, Number(req.params.id)]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Classroom not found' });
    res.json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'That classroom already exists' });
    next(err);
  }
});

classroomsRouter.delete('/:id', async (req, res, next) => {
  try {
    await query(`UPDATE sc_classrooms SET is_active = false WHERE id=$1`, [Number(req.params.id)]);
    res.status(204).end();
  } catch (err) { next(err); }
});
