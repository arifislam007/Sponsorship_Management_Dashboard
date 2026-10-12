import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';

export const membersRouter = Router();

// Never select portal_password_hash out — it must never be echoed back in
// any API response, only ever written.
const PUBLIC_COLUMNS = `
  id, full_name, father_name, mother_name, national_id, present_address, permanent_address,
  phone, email, occupation, date_joined, membership_fee_paid, photo, signature, status, notes,
  portal_username, created_at, updated_at
`;

membersRouter.get('/members', async (req, res, next) => {
  try {
    const { status, search, limit = 100, offset = 0 } = req.query;
    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(full_name ILIKE $${params.length} OR phone ILIKE $${params.length} OR national_id ILIKE $${params.length})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(Math.min(Number(limit), 500));
    params.push(Math.max(Number(offset), 0));

    const r = await query(
      `SELECT ${PUBLIC_COLUMNS} FROM npo_members ${where} ORDER BY full_name LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json(r.rows);
  } catch (err) { next(err); }
});

membersRouter.get('/members/:id', async (req, res, next) => {
  try {
    const r = await query(`SELECT ${PUBLIC_COLUMNS} FROM npo_members WHERE id = $1`, [Number(req.params.id)]);
    if (r.rows.length === 0) return res.status(404).json({ message: 'Member not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

membersRouter.post('/members', async (req, res, next) => {
  try {
    const {
      full_name, father_name, mother_name, national_id,
      present_address, permanent_address, phone, email, occupation,
      date_joined, membership_fee_paid, photo, signature, status, notes,
      portal_username, portal_password,
    } = req.body || {};
    if (!full_name?.trim()) return res.status(400).json({ message: 'full_name is required' });
    const passwordHash = portal_password ? await bcrypt.hash(portal_password, 10) : null;
    const r = await query(
      `INSERT INTO npo_members
         (full_name, father_name, mother_name, national_id, present_address, permanent_address,
          phone, email, occupation, date_joined, membership_fee_paid, photo, signature, status, notes,
          portal_username, portal_password_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
      [full_name.trim(), father_name || null, mother_name || null, national_id || null,
        present_address || null, permanent_address || null, phone || null, email || null,
        occupation || null, date_joined || null, membership_fee_paid || null, photo || null, signature || null,
        status || 'active', notes || null, portal_username || null, passwordHash]
    );
    const full = await query(`SELECT ${PUBLIC_COLUMNS} FROM npo_members WHERE id = $1`, [r.rows[0].id]);
    res.status(201).json(full.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'That portal username is already taken' });
    next(err);
  }
});

membersRouter.put('/members/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const {
      full_name, father_name, mother_name, national_id,
      present_address, permanent_address, phone, email, occupation,
      date_joined, membership_fee_paid, photo, signature, status, notes,
      portal_username, portal_password,
    } = req.body || {};

    const sets = [
      'full_name=$1', 'father_name=$2', 'mother_name=$3', 'national_id=$4',
      'present_address=$5', 'permanent_address=$6', 'phone=$7', 'email=$8', 'occupation=$9',
      'date_joined=$10', 'membership_fee_paid=$11', 'photo=$12', 'signature=$13', 'status=$14', 'notes=$15',
      'portal_username=$16', 'updated_at=CURRENT_TIMESTAMP',
    ];
    const params = [full_name?.trim(), father_name || null, mother_name || null, national_id || null,
      present_address || null, permanent_address || null, phone || null, email || null,
      occupation || null, date_joined || null, membership_fee_paid || null, photo || null, signature || null,
      status || 'active', notes || null, portal_username || null];

    // Only touch the password hash when staff actually typed a new one —
    // leaving the field blank on edit must not wipe existing portal access.
    if (portal_password) {
      params.push(await bcrypt.hash(portal_password, 10));
      sets.push(`portal_password_hash=$${params.length}`);
    }
    params.push(id);

    const r = await query(`UPDATE npo_members SET ${sets.join(', ')} WHERE id=$${params.length} RETURNING id`, params);
    if (r.rows.length === 0) return res.status(404).json({ message: 'Member not found' });
    const full = await query(`SELECT ${PUBLIC_COLUMNS} FROM npo_members WHERE id = $1`, [id]);
    res.json(full.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'That portal username is already taken' });
    next(err);
  }
});

membersRouter.delete('/members/:id', async (req, res, next) => {
  try {
    const r = await query(
      `UPDATE npo_members SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`,
      [Number(req.params.id)]
    );
    if (r.rows.length === 0) return res.status(404).json({ message: 'Member not found' });
    res.status(204).end();
  } catch (err) { next(err); }
});
