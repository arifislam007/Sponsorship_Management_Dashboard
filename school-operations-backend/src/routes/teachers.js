import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// ==========================================
// TEACHERS MANAGEMENT
// ==========================================

// Get all teachers
router.get('/teachers', async (req, res) => {
  try {
    const result = await query('SELECT * FROM teachers ORDER BY full_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get teacher by ID
router.get('/teachers/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM teachers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create teacher
router.post('/teachers', async (req, res) => {
  const { full_name, email, phone, specialization, qualification, hire_date, status } = req.body;
  try {
    const result = await query(
      'INSERT INTO teachers (full_name, email, phone, specialization, qualification, hire_date, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [full_name, email, phone, specialization, qualification, hire_date, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update teacher
router.put('/teachers/:id', async (req, res) => {
  const { full_name, email, phone, specialization, qualification, status } = req.body;
  try {
    const result = await query(
      'UPDATE teachers SET full_name = $1, email = $2, phone = $3, specialization = $4, qualification = $5, status = $6, updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
      [full_name, email, phone, specialization, qualification, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete teacher
router.delete('/teachers/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM teachers WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    res.json({ message: 'Teacher deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CLASS-TEACHER ASSIGNMENTS
// ==========================================

// Get assignments for a class
router.get('/assignments/class/:classId', async (req, res) => {
  try {
    const result = await query(`
      SELECT cta.*, t.full_name as teacher_name, c.class_name
      FROM class_teacher_assignments cta
      LEFT JOIN teachers t ON cta.teacher_id = t.id
      LEFT JOIN classes c ON cta.class_id = c.id
      WHERE cta.class_id = $1 AND cta.status = 'active'
      ORDER BY t.full_name
    `, [req.params.classId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get assignments for a teacher
router.get('/assignments/teacher/:teacherId', async (req, res) => {
  try {
    const result = await query(`
      SELECT cta.*, t.full_name as teacher_name, c.class_name
      FROM class_teacher_assignments cta
      LEFT JOIN teachers t ON cta.teacher_id = t.id
      LEFT JOIN classes c ON cta.class_id = c.id
      WHERE cta.teacher_id = $1 AND cta.status = 'active'
      ORDER BY c.class_name
    `, [req.params.teacherId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create assignment
router.post('/assignments', async (req, res) => {
  const { class_id, teacher_id, subject } = req.body;
  try {
    const result = await query(
      'INSERT INTO class_teacher_assignments (class_id, teacher_id, subject) VALUES ($1, $2, $3) RETURNING *',
      [class_id, teacher_id, subject]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update assignment
router.put('/assignments/:id', async (req, res) => {
  const { subject, status } = req.body;
  try {
    const result = await query(
      'UPDATE class_teacher_assignments SET subject = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [subject, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete assignment
router.delete('/assignments/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM class_teacher_assignments WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
