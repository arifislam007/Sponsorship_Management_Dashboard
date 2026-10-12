import { Router } from 'express';
import { query } from '../db.js';

export const positionsRouter = Router();

positionsRouter.get('/positions', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT * FROM npo_positions WHERE is_active = true ORDER BY parent_position_id NULLS FIRST, sort_order, id`
    );
    res.json(r.rows);
  } catch (err) { next(err); }
});

positionsRouter.post('/positions', async (req, res, next) => {
  try {
    const { title, person_name, photo, parent_position_id, sort_order } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ message: 'title is required' });
    const r = await query(
      `INSERT INTO npo_positions (title, person_name, photo, parent_position_id, sort_order)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [title.trim(), person_name || null, photo || null, parent_position_id || null, sort_order || 0]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

positionsRouter.put('/positions/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { title, person_name, photo, parent_position_id, sort_order } = req.body || {};
    if (parent_position_id && Number(parent_position_id) === id) {
      return res.status(400).json({ message: 'A position cannot report to itself' });
    }
    const r = await query(
      `UPDATE npo_positions SET title=$1, person_name=$2, photo=$3, parent_position_id=$4,
         sort_order=$5, updated_at=CURRENT_TIMESTAMP
       WHERE id=$6 AND is_active = true RETURNING *`,
      [title?.trim(), person_name || null, photo || null, parent_position_id || null, sort_order || 0, id]
    );
    if (r.rows.length === 0) return res.status(404).json({ message: 'Position not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

positionsRouter.delete('/positions/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const children = await query(
      `SELECT COUNT(*)::int AS count FROM npo_positions WHERE parent_position_id = $1 AND is_active = true`,
      [id]
    );
    if (children.rows[0].count > 0) {
      return res.status(409).json({ message: 'Re-parent or delete this position\'s direct reports first' });
    }
    await query(`UPDATE npo_positions SET is_active = false WHERE id = $1`, [id]);
    res.status(204).end();
  } catch (err) { next(err); }
});
