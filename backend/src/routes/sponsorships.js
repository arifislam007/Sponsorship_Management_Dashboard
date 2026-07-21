import { Router } from 'express';
import { query } from '../db.js';

export const sponsorshipsRouter = Router();

async function syncStudentSponsoredStatus(studentId) {
  const activeResult = await query(
    `SELECT COUNT(*)::int AS count
     FROM sponsorships
     WHERE student_id = $1 AND status = 'Active'`,
    [studentId]
  );

  const hasActiveSponsorship = (activeResult.rows[0]?.count || 0) > 0;
  await query('UPDATE students SET is_sponsored = $2 WHERE id = $1', [studentId, hasActiveSponsorship]);
}

async function syncDonorTotal(donorId) {
  await query(
    `UPDATE donors
     SET total_contributed = COALESCE(
       (SELECT SUM(amount) FROM sponsorships WHERE donor_id = $1),
       0
     )
     WHERE id = $1`,
    [donorId]
  );
}

sponsorshipsRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 500);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim().toLowerCase();

    let whereClause = '';
    const params = [];

    if (search) {
      whereClause += `(st.name ILIKE $${params.length + 1} OR d.name ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    if (status && (status === 'active' || status === 'ended')) {
      if (whereClause) whereClause += ' AND ';
      whereClause += `s.status = $${params.length + 1}`;
      params.push(status === 'active' ? 'Active' : 'Ended');
    }

    const where = whereClause ? `WHERE ${whereClause}` : '';

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM sponsorships s
       JOIN students st ON st.id = s.student_id
       JOIN donors d ON d.id = s.donor_id
       ${where}`,
      params
    );

    params.push(limit, offset);

    const result = await query(
      `SELECT
         s.id,
         s.student_id,
         st.name AS student_name,
         s.donor_id,
         d.name AS donor_name,
         s.amount::float8 AS amount,
         s.start_date,
         s.end_date,
         s.status,
         s.period,
         s.payment_media,
         s.reference_number
       FROM sponsorships s
       JOIN students st ON st.id = s.student_id
       JOIN donors d ON d.id = s.donor_id
       ${where}
       ORDER BY s.start_date DESC, s.id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      data: result.rows.map((row) => ({
        ...row,
        status: String(row.status).toLowerCase(),
      })),
      total: countResult.rows[0].total,
      limit,
      offset,
    });
  } catch (error) {
    next(error);
  }
});

function generateReferenceNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SP-${timestamp}-${random}`;
}

function calculateEndDate(startDate, period) {
  if (period === 'continuous') return null;
  
  const monthsMap = { '3': 3, '6': 6, '9': 9, '12': 12 };
  const months = monthsMap[String(period)];
  
  if (!months) return null;
  
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + months);
  
  return date.toISOString().split('T')[0];
}

sponsorshipsRouter.post('/', async (req, res, next) => {
  try {
    const { student_id, donor_id, start_date, amount, status, period, payment_media } = req.body;
    const parsedAmount = Number(amount);

    if (!student_id || !donor_id || !start_date || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'student_id, donor_id, start_date and valid amount are required.' });
    }

    const normalizedStatus = status === 'Ended' ? 'Ended' : 'Active';
    const calculatedEndDate = period ? calculateEndDate(start_date, period) : null;
    const referenceNumber = generateReferenceNumber();

    const insertResult = await query(
      `INSERT INTO sponsorships (student_id, donor_id, start_date, end_date, amount, status, period, payment_media, reference_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, student_id, donor_id, start_date, end_date, amount::float8 AS amount, status, period, payment_media, reference_number`,
      [student_id, donor_id, start_date, calculatedEndDate, parsedAmount, normalizedStatus, period || null, payment_media || null, referenceNumber]
    );

    await syncDonorTotal(donor_id);
    await syncStudentSponsoredStatus(student_id);

    return res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    next(error);
  }
});

sponsorshipsRouter.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, end_date, amount } = req.body;
    const parsedId = Number(id);

    if (!status || (status !== 'Active' && status !== 'Ended')) {
      return res.status(400).json({ message: 'status must be Active or Ended.' });
    }

    const existingResult = await query(
      'SELECT student_id, donor_id, status, amount::float8 AS amount FROM sponsorships WHERE id = $1',
      [parsedId]
    );
    const existingSponsorship = existingResult.rows[0];

    if (!existingSponsorship) {
      return res.status(404).json({ message: 'Sponsorship not found.' });
    }

    const parsedAmount = amount !== undefined ? Number(amount) : null;
    const amountClause = parsedAmount !== null && parsedAmount > 0 ? `, amount = $4` : '';
    const params = parsedAmount !== null && parsedAmount > 0
      ? [status, end_date || null, parsedId, parsedAmount]
      : [status, end_date || null, parsedId];

    const result = await query(
      `UPDATE sponsorships
       SET status = $1, end_date = $2${amountClause}
       WHERE id = $3
       RETURNING id, student_id, donor_id, start_date, end_date, amount::float8 AS amount, status`,
      params
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Sponsorship not found.' });
    }

    await syncDonorTotal(existingSponsorship.donor_id);
    await syncStudentSponsoredStatus(result.rows[0].student_id);

    return res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});
