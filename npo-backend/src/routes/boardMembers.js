import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';

export const boardMembersRouter = Router();

const BOARD_TYPES = ['executive', 'advisor'];

// name/photo/phone/email are resolved live from the linked Membership record
// (when member_id is set) via COALESCE, so editing a person's details in
// Membership automatically reflects here — the npo_board_members columns
// stay populated as a write-time snapshot/fallback for unlinked (advisor)
// records, never as the source of truth for linked ones.
// Never select portal_password_hash out — write-only column.
const SELECT_SQL = `
  SELECT b.id, b.board_type,
         COALESCE(m.full_name, b.full_name) AS full_name,
         b.position_title,
         COALESCE(m.photo, b.photo) AS photo,
         b.signature,
         COALESCE(m.phone, b.phone) AS phone,
         COALESCE(m.email, b.email) AS email,
         b.term_start_date, b.term_end_date, b.bio_notes, b.is_active,
         b.portal_username, b.member_id, b.created_at, b.updated_at
  FROM npo_board_members b
  LEFT JOIN npo_members m ON m.id = b.member_id
`;

boardMembersRouter.get('/board-members', async (req, res, next) => {
  try {
    const { type } = req.query;
    const params = [];
    let where = '';
    if (type) {
      if (!BOARD_TYPES.includes(type)) return res.status(400).json({ message: 'Invalid board type' });
      params.push(type);
      where = `WHERE b.board_type = $1`;
    }
    const r = await query(
      `${SELECT_SQL} ${where}
       ORDER BY (b.term_end_date IS NOT NULL AND b.term_end_date < CURRENT_DATE), full_name`,
      params
    );
    res.json(r.rows);
  } catch (err) { next(err); }
});

// Resolves the snapshot values to store on npo_board_members itself. When
// member_id is given, the linked member's current record wins over whatever
// was typed in the form (Membership is the source of truth); photo/phone/
// email fall back to the typed value only if the member record has none set.
async function resolveFromMember(member_id, { full_name, photo, phone, email }) {
  if (!member_id) return { full_name: full_name?.trim(), photo: photo || null, phone: phone || null, email: email || null };
  const m = await query(`SELECT full_name, photo, phone, email FROM npo_members WHERE id = $1`, [member_id]);
  if (m.rows.length === 0) {
    const err = new Error('Linked member not found');
    err.status = 400;
    throw err;
  }
  return {
    full_name: m.rows[0].full_name,
    photo: m.rows[0].photo || photo || null,
    phone: m.rows[0].phone || phone || null,
    email: m.rows[0].email || email || null,
  };
}

boardMembersRouter.post('/board-members', async (req, res, next) => {
  try {
    const {
      board_type, full_name, position_title, photo, signature, phone, email,
      term_start_date, term_end_date, bio_notes, portal_username, portal_password, member_id,
    } = req.body || {};
    if (!BOARD_TYPES.includes(board_type)) return res.status(400).json({ message: 'board_type must be executive or advisor' });
    if (board_type === 'executive' && !member_id) {
      return res.status(400).json({ message: 'Executive Board members must be linked to an existing General Member' });
    }

    const resolved = await resolveFromMember(member_id || null, { full_name, photo, phone, email });
    if (!resolved.full_name) return res.status(400).json({ message: 'full_name is required' });

    const passwordHash = portal_password ? await bcrypt.hash(portal_password, 10) : null;
    const r = await query(
      `INSERT INTO npo_board_members
         (board_type, full_name, position_title, photo, signature, phone, email, term_start_date, term_end_date, bio_notes,
          portal_username, portal_password_hash, member_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [board_type, resolved.full_name, position_title || null, resolved.photo, signature || null, resolved.phone, resolved.email,
        term_start_date || null, term_end_date || null, bio_notes || null, portal_username || null, passwordHash, member_id || null]
    );
    const full = await query(`${SELECT_SQL} WHERE b.id = $1`, [r.rows[0].id]);
    res.status(201).json(full.rows[0]);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    if (err.code === '23505') return res.status(409).json({ message: 'That portal username is already taken' });
    next(err);
  }
});

boardMembersRouter.put('/board-members/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const {
      full_name, position_title, photo, signature, phone, email,
      term_start_date, term_end_date, bio_notes, portal_username, portal_password, member_id,
    } = req.body || {};

    const existing = await query(`SELECT board_type FROM npo_board_members WHERE id = $1`, [id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: 'Board member not found' });
    if (existing.rows[0].board_type === 'executive' && !member_id) {
      return res.status(400).json({ message: 'Executive Board members must be linked to an existing General Member' });
    }

    const resolved = await resolveFromMember(member_id || null, { full_name, photo, phone, email });
    if (!resolved.full_name) return res.status(400).json({ message: 'full_name is required' });

    const sets = [
      'full_name=$1', 'position_title=$2', 'photo=$3', 'signature=$4', 'phone=$5', 'email=$6',
      'term_start_date=$7', 'term_end_date=$8', 'bio_notes=$9', 'portal_username=$10', 'member_id=$11',
      'updated_at=CURRENT_TIMESTAMP',
    ];
    const params = [resolved.full_name, position_title || null, resolved.photo, signature || null, resolved.phone, resolved.email,
      term_start_date || null, term_end_date || null, bio_notes || null, portal_username || null, member_id || null];

    if (portal_password) {
      params.push(await bcrypt.hash(portal_password, 10));
      sets.push(`portal_password_hash=$${params.length}`);
    }
    params.push(id);

    const r = await query(`UPDATE npo_board_members SET ${sets.join(', ')} WHERE id=$${params.length} RETURNING id`, params);
    if (r.rows.length === 0) return res.status(404).json({ message: 'Board member not found' });
    const full = await query(`${SELECT_SQL} WHERE b.id = $1`, [id]);
    res.json(full.rows[0]);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
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
