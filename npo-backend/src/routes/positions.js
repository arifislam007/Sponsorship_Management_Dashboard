import { Router } from 'express';
import { query } from '../db.js';

export const positionsRouter = Router();

// person_name/photo are resolved live from the linked Membership record
// (when member_id is set) via COALESCE — editing the person's details in
// Membership automatically reflects on the organogram. Free-text
// person_name/photo stay available for position-holders who aren't (yet)
// general members; member_id is optional here (only mandatory for
// Executive Board, enforced in boardMembers.js).
const SELECT_SQL = `
  SELECT p.id, p.title,
         COALESCE(m.full_name, p.person_name) AS person_name,
         COALESCE(m.photo, p.photo) AS photo,
         p.parent_position_id, p.sort_order, p.is_active, p.member_id,
         p.created_at, p.updated_at
  FROM npo_positions p
  LEFT JOIN npo_members m ON m.id = p.member_id
`;

async function resolveFromMember(member_id, { person_name, photo }) {
  if (!member_id) return { person_name: person_name || null, photo: photo || null };
  const m = await query(`SELECT full_name, photo FROM npo_members WHERE id = $1`, [member_id]);
  if (m.rows.length === 0) {
    const err = new Error('Linked member not found');
    err.status = 400;
    throw err;
  }
  return { person_name: m.rows[0].full_name, photo: m.rows[0].photo || photo || null };
}

positionsRouter.get('/positions', async (req, res, next) => {
  try {
    const r = await query(
      `${SELECT_SQL} WHERE p.is_active = true ORDER BY p.parent_position_id NULLS FIRST, p.sort_order, p.id`
    );
    res.json(r.rows);
  } catch (err) { next(err); }
});

positionsRouter.post('/positions', async (req, res, next) => {
  try {
    const { title, person_name, photo, parent_position_id, sort_order, member_id } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ message: 'title is required' });
    const resolved = await resolveFromMember(member_id || null, { person_name, photo });
    const r = await query(
      `INSERT INTO npo_positions (title, person_name, photo, parent_position_id, sort_order, member_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [title.trim(), resolved.person_name, resolved.photo, parent_position_id || null, sort_order || 0, member_id || null]
    );
    const full = await query(`${SELECT_SQL} WHERE p.id = $1`, [r.rows[0].id]);
    res.status(201).json(full.rows[0]);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
});

positionsRouter.put('/positions/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { title, person_name, photo, parent_position_id, sort_order, member_id } = req.body || {};
    if (parent_position_id && Number(parent_position_id) === id) {
      return res.status(400).json({ message: 'A position cannot report to itself' });
    }
    const resolved = await resolveFromMember(member_id || null, { person_name, photo });
    const r = await query(
      `UPDATE npo_positions SET title=$1, person_name=$2, photo=$3, parent_position_id=$4,
         sort_order=$5, member_id=$6, updated_at=CURRENT_TIMESTAMP
       WHERE id=$7 AND is_active = true RETURNING id`,
      [title?.trim(), resolved.person_name, resolved.photo, parent_position_id || null, sort_order || 0, member_id || null, id]
    );
    if (r.rows.length === 0) return res.status(404).json({ message: 'Position not found' });
    const full = await query(`${SELECT_SQL} WHERE p.id = $1`, [id]);
    res.json(full.rows[0]);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
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
