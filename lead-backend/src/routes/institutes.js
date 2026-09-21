import { Router } from 'express';
import { query } from '../db.js';

export const institutesRouter = Router();

institutesRouter.get('/', async (req, res, next) => {
  try {
    const { search, institute_type, status, limit = 100, offset = 0 } = req.query;
    const params = [];
    const clauses = [];

    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(name ILIKE $${params.length} OR location ILIKE $${params.length} OR contact_person_name ILIKE $${params.length})`);
    }
    if (institute_type) { params.push(institute_type); clauses.push(`institute_type = $${params.length}`); }
    if (status) { params.push(status); clauses.push(`status = $${params.length}`); }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const countResult = await query(`SELECT COUNT(*)::int AS total FROM lead_institutes ${where}`, params);

    params.push(Math.min(Number(limit), 500), Math.max(Number(offset), 0));
    const result = await query(
      `SELECT * FROM lead_institutes ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: result.rows, total: countResult.rows[0].total });
  } catch (err) { next(err); }
});

institutesRouter.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM lead_institutes WHERE id = $1', [Number(req.params.id)]);
    if (!result.rows.length) return res.status(404).json({ message: 'Institute not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

institutesRouter.post('/', async (req, res, next) => {
  try {
    const {
      name, institute_type, location, contact_person_name, contact_person_designation,
      contact_person_phone, approx_student_count, status, notes,
    } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Institute name is required' });

    const result = await query(
      `INSERT INTO lead_institutes
         (name, institute_type, location, contact_person_name, contact_person_designation,
          contact_person_phone, approx_student_count, status, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [name.trim(), institute_type || 'School', location || null, contact_person_name || null,
       contact_person_designation || null, contact_person_phone || null,
       approx_student_count ? Number(approx_student_count) : null,
       status || 'Prospect', notes || null, req.user?.username || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

institutesRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const {
      name, institute_type, location, contact_person_name, contact_person_designation,
      contact_person_phone, approx_student_count, status, notes,
    } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Institute name is required' });

    const result = await query(
      `UPDATE lead_institutes SET
         name = $2, institute_type = $3, location = $4,
         contact_person_name = $5, contact_person_designation = $6, contact_person_phone = $7,
         approx_student_count = $8, status = $9, notes = $10,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, name.trim(), institute_type || 'School', location || null, contact_person_name || null,
       contact_person_designation || null, contact_person_phone || null,
       approx_student_count ? Number(approx_student_count) : null,
       status || 'Prospect', notes || null]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Institute not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

institutesRouter.delete('/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM lead_institutes WHERE id = $1', [Number(req.params.id)]);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});
