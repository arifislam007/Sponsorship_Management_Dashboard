import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';

export const boardMembersRouter = Router();

const BOARD_TYPES = ['executive', 'advisor'];

// Never select portal_password_hash out — write-only column.
const PUBLIC_COLUMNS = `
  id, board_type, full_name, position_title, photo, signature, phone, email,
  term_start_date, term_end_date, bio_notes, is_active, portal_username, created_at, updated_at
`;

boardMembersRouter.get('/board-members', async (req, res, next) => {
  try {
    const { type } = req.query;
    const params = [];
    let where = '';
    if (type) {
      if (!BOARD_TYPES.includes(type)) return res.status(400).json({ message: 'Invalid board type' });
      params.push(type);
      where = `WHERE board_type = $1`;
    }
    const r = await query(
      `SELECT ${PUBLIC_COLUMNS} FROM npo_board_members ${where}
       ORDER BY (term_end_date IS NOT NULL AND term_end_date < CURRENT_DATE), full_name`,
      params
    );
    res.json(r.rows);
  } catch (err) { next(err); }
});

boardMembersRouter.post('/board-members', async (req, res, next) => {
  try {
    const {
      board_type, full_name, position_title, photo, signature, phone, email,
      term_start_date, term_end_date, bio_notes, portal_username, portal_password,
    } = req.body || {};
    if (!BOARD_TYPES.includes(board_type)) return res.status(400).json({ message: 'board_type must be executive or advisor' });
    if (!full_name?.trim()) return res.status(400).json({ message: 'full_name is required' });
    const passwordHash = portal_password ? await bcrypt.hash(portal_password, 10) : null;
    const r = await query(
      `INSERT INTO npo_board_members
         (board_type, full_name, position_title, photo, signature, phone, email, term_start_date, term_end_date, bio_notes,
          portal_username, portal_password_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [board_type, full_name.trim(), position_title || null, photo || null, signature || null, phone || null, email || null,
        term_start_date || null, term_end_date || null, bio_notes || null, portal_username || null, passwordHash]
    );
    const full = await query(`SELECT ${PUBLIC_COLUMNS} FROM npo_board_members WHERE id = $1`, [r.rows[0].id]);
    res.status(201).json(full.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'That portal username is already taken' });
    next(err);
  }
});

boardMembersRouter.put('/board-members/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const {
      full_name, position_title, photo, signature, phone, email,
      term_start_date, term_end_date, bio_notes, portal_username, portal_password,
    } = req.body || {};

    const sets = [
      'full_name=$1', 'position_title=$2', 'photo=$3', 'signature=$4', 'phone=$5', 'email=$6',
      'term_start_date=$7', 'term_end_date=$8', 'bio_notes=$9', 'portal_username=$10', 'updated_at=CURRENT_TIMESTAMP',
    ];
    const params = [full_name?.trim(), position_title || null, photo || null, signature || null, phone || null, email || null,
      term_start_date || null, term_end_date || null, bio_notes || null, portal_username || null];

    if (portal_password) {
      params.push(await bcrypt.hash(portal_password, 10));
      sets.push(`portal_password_hash=$${params.length}`);
    }
    params.push(id);

    const r = await query(`UPDATE npo_board_members SET ${sets.join(', ')} WHERE id=$${params.length} RETURNING id`, params);
    if (r.rows.length === 0) return res.status(404).json({ message: 'Board member not found' });
    const full = await query(`SELECT ${PUBLIC_COLUMNS} FROM npo_board_members WHERE id = $1`, [id]);
    res.json(full.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'That portal username is already taken' });
    next(err);
  }
});

boardMembersRouter.delete('/board-members/:id', async (req, res, next) => {
  try {
    await query(`DELETE FROM npo_board_members WHERE id = $1`, [Number(req.params.id)]);
    res.status(204).end();
  } catch (err) { next(err); }
});
