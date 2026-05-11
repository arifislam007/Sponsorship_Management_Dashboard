import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// ==========================================
// CLASSES MANAGEMENT
// ==========================================

// Get all classes
router.get('/classes', async (req, res) => {
  try {
    const result = await query('SELECT * FROM classes ORDER BY class_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get class by ID
router.get('/classes/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM classes WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create class
router.post('/classes', async (req, res) => {
  const { class_name, description, capacity } = req.body;
  try {
    const result = await query(
      'INSERT INTO classes (class_name, description, capacity) VALUES ($1, $2, $3) RETURNING *',
      [class_name, description, capacity]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update class
router.put('/classes/:id', async (req, res) => {
  const { class_name, description, capacity } = req.body;
  try {
    const result = await query(
      'UPDATE classes SET class_name = $1, description = $2, capacity = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [class_name, description, capacity, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete class
router.delete('/classes/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM classes WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.json({ message: 'Class deleted', class: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// CLASS ROUTINES MANAGEMENT
// ==========================================

// Get routine for a class (all periods for all days)
router.get('/routines/class/:classId', async (req, res) => {
  try {
    const result = await query(`
      SELECT cr.*, t.full_name as teacher_name
      FROM class_routines cr
      LEFT JOIN teachers t ON cr.teacher_id = t.id
      WHERE cr.class_id = $1
      ORDER BY 
        CASE 
          WHEN cr.day_of_week = 'Monday' THEN 1
          WHEN cr.day_of_week = 'Tuesday' THEN 2
          WHEN cr.day_of_week = 'Wednesday' THEN 3
          WHEN cr.day_of_week = 'Thursday' THEN 4
          WHEN cr.day_of_week = 'Friday' THEN 5
          WHEN cr.day_of_week = 'Saturday' THEN 6
          ELSE 7
        END,
        cr.period_number
    `, [req.params.classId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get routine for a specific day and class
router.get('/routines/class/:classId/day/:day', async (req, res) => {
  try {
    const result = await query(`
      SELECT cr.*, t.full_name as teacher_name
      FROM class_routines cr
      LEFT JOIN teachers t ON cr.teacher_id = t.id
      WHERE cr.class_id = $1 AND cr.day_of_week = $2
      ORDER BY cr.period_number
    `, [req.params.classId, req.params.day]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add routine entry
router.post('/routines', async (req, res) => {
  const { class_id, day_of_week, period_number, start_time, end_time, subject, teacher_id, room_number } = req.body;
  try {
    const result = await query(
      'INSERT INTO class_routines (class_id, day_of_week, period_number, start_time, end_time, subject, teacher_id, room_number) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [class_id, day_of_week, period_number, start_time, end_time, subject, teacher_id, room_number]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update routine entry
router.put('/routines/:id', async (req, res) => {
  const { subject, teacher_id, room_number, start_time, end_time } = req.body;
  try {
    const result = await query(
      'UPDATE class_routines SET subject = $1, teacher_id = $2, room_number = $3, start_time = $4, end_time = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [subject, teacher_id, room_number, start_time, end_time, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Routine not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete routine entry
router.delete('/routines/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM class_routines WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Routine not found' });
    }
    res.json({ message: 'Routine deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
