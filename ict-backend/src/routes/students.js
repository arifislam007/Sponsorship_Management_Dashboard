import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// Get all ICT students
router.get('/students', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, student_name, email, phone, date_of_birth, gender, profile_image, admission_data, skills, certifications, created_at
       FROM ict_students
       ORDER BY created_at DESC`
    );
    res.json({ students: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get student by ID
router.get('/students/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT * FROM ict_students WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ student: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.get('/students/:id/earnings', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT id, student_id, earning_source, amount::float8 AS amount, earning_date, notes, created_at, updated_at
       FROM ict_student_earnings
       WHERE student_id = $1
       ORDER BY earning_date DESC, created_at DESC`,
      [id]
    );

    res.json({ earnings: result.rows });
  } catch (error) {
    next(error);
  }
});

// Create new ICT student
router.post('/students', async (req, res, next) => {
  try {
    const { student_name, phone, course } = req.body;

    if (!student_name) {
      return res.status(400).json({ message: 'student_name is required.' });
    }

    const result = await query(
      `INSERT INTO ict_students (student_name, phone, course)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [student_name, phone || null, course || null]
    );

    res.status(201).json({ student: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update student profile
router.patch('/students/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { student_name, email, phone, date_of_birth, gender, father_name, mother_name, guardian_contact, bio, skills, certifications, profile_image } = req.body;

    const result = await query(
      `UPDATE ict_students
       SET student_name = COALESCE($2, student_name),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           date_of_birth = COALESCE($5, date_of_birth),
           gender = COALESCE($6, gender),
           father_name = COALESCE($7, father_name),
           mother_name = COALESCE($8, mother_name),
           guardian_contact = COALESCE($9, guardian_contact),
           bio = COALESCE($10, bio),
           skills = COALESCE($11, skills),
           certifications = COALESCE($12, certifications),
           profile_image = COALESCE($13, profile_image),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, student_name, email, phone, date_of_birth, gender, father_name, mother_name, guardian_contact, bio, skills, certifications, profile_image]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ student: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.post('/students/:id/earnings', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { earning_source, amount, earning_date, notes } = req.body || {};
    const parsedAmount = Number(amount);

    if (!earning_source || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'earning_source and valid amount are required.' });
    }

    const studentResult = await query('SELECT id FROM ict_students WHERE id = $1', [id]);
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const result = await query(
      `INSERT INTO ict_student_earnings (student_id, earning_source, amount, earning_date, notes)
       VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5)
       RETURNING id, student_id, earning_source, amount::float8 AS amount, earning_date, notes, created_at, updated_at`,
      [id, earning_source, parsedAmount, earning_date || null, notes || null]
    );

    res.status(201).json({ earning: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
