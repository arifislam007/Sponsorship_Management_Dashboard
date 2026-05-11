import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// ==========================================
// EXAMS MANAGEMENT
// ==========================================

// Get all exams
router.get('/exams', async (req, res) => {
  try {
    const result = await query('SELECT * FROM exams ORDER BY start_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get exam by ID
router.get('/exams/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM exams WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create exam
router.post('/exams', async (req, res) => {
  const { exam_name, exam_type, start_date, end_date, description, status } = req.body;
  try {
    const result = await query(
      `INSERT INTO exams (exam_name, exam_type, start_date, end_date, description, status) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [exam_name, exam_type, start_date, end_date, description, status || 'scheduled']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update exam
router.put('/exams/:id', async (req, res) => {
  const { exam_name, exam_type, start_date, end_date, description, status } = req.body;
  try {
    const result = await query(
      `UPDATE exams 
       SET exam_name = $1, exam_type = $2, start_date = $3, end_date = $4, description = $5, status = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 
       RETURNING *`,
      [exam_name, exam_type, start_date, end_date, description, status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete exam
router.delete('/exams/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM exams WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    res.json({ message: 'Exam deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// EXAM SCHEDULES
// ==========================================

// Get schedules for an exam
router.get('/schedules/exam/:examId', async (req, res) => {
  try {
    const result = await query(`
      SELECT es.*, e.exam_name, c.class_name, t.full_name as invigilator_name
      FROM exam_schedules es
      LEFT JOIN exams e ON es.exam_id = e.id
      LEFT JOIN classes c ON es.class_id = c.id
      LEFT JOIN teachers t ON es.invigilator_id = t.id
      WHERE es.exam_id = $1
      ORDER BY es.exam_date, es.start_time
    `, [req.params.examId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get schedules for a class
router.get('/schedules/class/:classId', async (req, res) => {
  try {
    const result = await query(`
      SELECT es.*, e.exam_name, c.class_name, t.full_name as invigilator_name
      FROM exam_schedules es
      LEFT JOIN exams e ON es.exam_id = e.id
      LEFT JOIN classes c ON es.class_id = c.id
      LEFT JOIN teachers t ON es.invigilator_id = t.id
      WHERE es.class_id = $1
      ORDER BY es.exam_date, es.start_time
    `, [req.params.classId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get upcoming exam schedules for a date range
router.get('/schedules/upcoming/:classId', async (req, res) => {
  try {
    const result = await query(`
      SELECT es.*, e.exam_name, c.class_name, t.full_name as invigilator_name
      FROM exam_schedules es
      LEFT JOIN exams e ON es.exam_id = e.id
      LEFT JOIN classes c ON es.class_id = c.id
      LEFT JOIN teachers t ON es.invigilator_id = t.id
      WHERE es.class_id = $1 AND es.exam_date >= CURRENT_DATE
      ORDER BY es.exam_date, es.start_time
      LIMIT 10
    `, [req.params.classId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create exam schedule
router.post('/schedules', async (req, res) => {
  const { exam_id, class_id, subject, exam_date, start_time, end_time, duration_minutes, total_marks, room_number, invigilator_id, notes } = req.body;
  try {
    const result = await query(
      `INSERT INTO exam_schedules 
       (exam_id, class_id, subject, exam_date, start_time, end_time, duration_minutes, total_marks, room_number, invigilator_id, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING *`,
      [exam_id, class_id, subject, exam_date, start_time, end_time, duration_minutes, total_marks, room_number, invigilator_id, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update exam schedule
router.put('/schedules/:id', async (req, res) => {
  const { subject, exam_date, start_time, end_time, duration_minutes, room_number, invigilator_id, notes } = req.body;
  try {
    const result = await query(
      `UPDATE exam_schedules 
       SET subject = $1, exam_date = $2, start_time = $3, end_time = $4, duration_minutes = $5, room_number = $6, invigilator_id = $7, notes = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 
       RETURNING *`,
      [subject, exam_date, start_time, end_time, duration_minutes, room_number, invigilator_id, notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete exam schedule
router.delete('/schedules/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM exam_schedules WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json({ message: 'Schedule deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// EXAM RESULTS
// ==========================================

// Get results for an exam schedule
router.get('/results/schedule/:scheduleId', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM exam_results
      WHERE exam_schedule_id = $1
      ORDER BY obtained_marks DESC
    `, [req.params.scheduleId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get results for a student
router.get('/results/student/:studentId', async (req, res) => {
  try {
    const result = await query(`
      SELECT er.*, es.exam_date, es.subject, e.exam_name
      FROM exam_results er
      LEFT JOIN exam_schedules es ON er.exam_schedule_id = es.id
      LEFT JOIN exams e ON es.exam_id = e.id
      WHERE er.student_id = $1
      ORDER BY es.exam_date DESC
    `, [req.params.studentId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add/Update exam result
router.post('/results', async (req, res) => {
  const { exam_schedule_id, student_id, obtained_marks, total_marks, grade, remarks } = req.body;
  try {
    const percentage = ((obtained_marks / total_marks) * 100).toFixed(2);
    
    const result = await query(
      `INSERT INTO exam_results 
       (exam_schedule_id, student_id, obtained_marks, total_marks, percentage, grade, remarks, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [exam_schedule_id, student_id, obtained_marks, total_marks, percentage, grade, remarks, 'graded']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update exam result
router.put('/results/:id', async (req, res) => {
  const { obtained_marks, total_marks, grade, status, remarks } = req.body;
  try {
    const percentage = ((obtained_marks / total_marks) * 100).toFixed(2);
    
    const result = await query(
      `UPDATE exam_results 
       SET obtained_marks = $1, total_marks = $2, percentage = $3, grade = $4, status = $5, remarks = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 
       RETURNING *`,
      [obtained_marks, total_marks, percentage, grade, status, remarks, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Result not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete exam result
router.delete('/results/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM exam_results WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Result not found' });
    }
    res.json({ message: 'Result deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
