import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// ==========================================
// CURRICULUM ACTIVITIES
// ==========================================

// Get all activities for a class
router.get('/activities/class/:classId', async (req, res) => {
  try {
    const result = await query(`
      SELECT ca.*, t.full_name as teacher_name
      FROM curriculum_activities ca
      LEFT JOIN teachers t ON ca.teacher_id = t.id
      WHERE ca.class_id = $1
      ORDER BY ca.due_date DESC
    `, [req.params.classId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get activities by status
router.get('/activities/class/:classId/status/:status', async (req, res) => {
  try {
    const result = await query(`
      SELECT ca.*, t.full_name as teacher_name
      FROM curriculum_activities ca
      LEFT JOIN teachers t ON ca.teacher_id = t.id
      WHERE ca.class_id = $1 AND ca.status = $2
      ORDER BY ca.due_date DESC
    `, [req.params.classId, req.params.status]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get activity by ID
router.get('/activities/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT ca.*, t.full_name as teacher_name
      FROM curriculum_activities ca
      LEFT JOIN teachers t ON ca.teacher_id = t.id
      WHERE ca.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create activity
router.post('/activities', async (req, res) => {
  const { class_id, activity_name, description, subject, activity_type, assigned_date, due_date, teacher_id, notes } = req.body;
  try {
    const result = await query(
      `INSERT INTO curriculum_activities 
       (class_id, activity_name, description, subject, activity_type, assigned_date, due_date, teacher_id, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [class_id, activity_name, description, subject, activity_type, assigned_date, due_date, teacher_id, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update activity
router.put('/activities/:id', async (req, res) => {
  const { activity_name, description, subject, activity_type, due_date, status, completion_percentage, notes } = req.body;
  try {
    const result = await query(
      `UPDATE curriculum_activities 
       SET activity_name = $1, description = $2, subject = $3, activity_type = $4, 
           due_date = $5, status = $6, completion_percentage = $7, notes = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 
       RETURNING *`,
      [activity_name, description, subject, activity_type, due_date, status, completion_percentage, notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete activity
router.delete('/activities/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM curriculum_activities WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    res.json({ message: 'Activity deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get activities due soon (next 7 days)
router.get('/activities/upcoming/:classId', async (req, res) => {
  try {
    const result = await query(`
      SELECT ca.*, t.full_name as teacher_name
      FROM curriculum_activities ca
      LEFT JOIN teachers t ON ca.teacher_id = t.id
      WHERE ca.class_id = $1 
        AND ca.due_date >= CURRENT_DATE 
        AND ca.due_date <= CURRENT_DATE + INTERVAL '7 days'
        AND ca.status != 'completed'
      ORDER BY ca.due_date ASC
    `, [req.params.classId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
