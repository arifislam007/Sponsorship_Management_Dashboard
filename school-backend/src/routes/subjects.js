import { Router } from 'express';
import { query } from '../db.js';

export const subjectsRouter = Router();

subjectsRouter.get('/', async (req, res, next) => {
  try {
    const r = await query(`SELECT * FROM sc_subjects WHERE is_active ORDER BY name`);
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

subjectsRouter.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Subject name is required' });
    const r = await query(`INSERT INTO sc_subjects (name) VALUES ($1) RETURNING *`, [name.trim()]);
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'That subject already exists' });
    next(err);
  }
});

subjectsRouter.put('/:id', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Subject name is required' });
    const r = await query(`UPDATE sc_subjects SET name=$1 WHERE id=$2 RETURNING *`, [name.trim(), Number(req.params.id)]);
    if (!r.rows.length) return res.status(404).json({ message: 'Subject not found' });
    res.json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'That subject already exists' });
    next(err);
  }
});

subjectsRouter.delete('/:id', async (req, res, next) => {
  try {
    await query(`UPDATE sc_subjects SET is_active = false WHERE id=$1`, [Number(req.params.id)]);
    res.status(204).end();
  } catch (err) { next(err); }
});
