import { Router } from 'express';
import { query } from '../db.js';

export const donorsRouter = Router();

donorsRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 500);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const search = String(req.query.search || '').trim();

    const whereClause = search
      ? `WHERE d.name ILIKE $1 OR d.email ILIKE $1 OR d.country ILIKE $1`
      : '';

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM donors d ${whereClause}`,
      search ? [`%${search}%`] : []
    );

    const result = await query(
      `SELECT
         d.id,
         d.name,
         d.email,
         d.phone,
         d.country,
         d.total_contributed::float8 AS total_contributed,
         COUNT(s.id)::int AS sponsored_students
       FROM donors d
       LEFT JOIN sponsorships s ON s.donor_id = d.id AND s.status = 'Active'
       ${whereClause}
       GROUP BY d.id
       ORDER BY d.id ASC
       LIMIT $${search ? 2 : 1} OFFSET $${search ? 3 : 2}`,
      search ? [`%${search}%`, limit, offset] : [limit, offset]
    );

    res.json({
      data: result.rows,
      total: countResult.rows[0].total,
      limit,
      offset,
    });
  } catch (error) {
    next(error);
  }
});

donorsRouter.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, country } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'name and email are required.' });
    }

    const result = await query(
      `INSERT INTO donors (name, email, phone, country, total_contributed)
       VALUES ($1, $2, $3, $4, 0)
       RETURNING id, name, email, phone, country, total_contributed::float8 AS total_contributed`,
      [name, email, phone || null, country || null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

donorsRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, country } = req.body;
    const parsedId = Number(id);

    if (!name || !email) {
      return res.status(400).json({ message: 'name and email are required.' });
    }

    const result = await query(
      `UPDATE donors
       SET name = $1, email = $2, phone = $3, country = $4
       WHERE id = $5
       RETURNING id, name, email, phone, country, total_contributed::float8 AS total_contributed`,
      [name, email, phone || null, country || null, parsedId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Donor not found.' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

donorsRouter.get('/:id/sponsored-students', async (req, res, next) => {
  try {
    const { id } = req.params;
    const parsedId = Number(id);

    const result = await query(
      `SELECT DISTINCT
         st.id,
         st.name,
         st.class,
         st.age,
         st.photo_url,
         s.amount::float8 AS sponsorship_amount,
         s.start_date,
         s.status
       FROM sponsorships s
       JOIN students st ON st.id = s.student_id
       WHERE s.donor_id = $1
       ORDER BY s.status DESC, s.start_date DESC`,
      [parsedId]
    );

    return res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

