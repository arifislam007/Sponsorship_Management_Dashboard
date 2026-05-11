import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// ==========================================
// TEACHER ATTENDANCE
// ==========================================

// Get attendance record by date
router.get('/attendance/date/:date', async (req, res) => {
  try {
    const result = await query(`
      SELECT ta.*, t.full_name as teacher_name
      FROM teacher_attendance ta
      LEFT JOIN teachers t ON ta.teacher_id = t.id
      WHERE ta.attendance_date = $1
      ORDER BY t.full_name
    `, [req.params.date]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get attendance record for a teacher
router.get('/attendance/teacher/:teacherId', async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    let query_text = `
      SELECT ta.*, t.full_name as teacher_name
      FROM teacher_attendance ta
      LEFT JOIN teachers t ON ta.teacher_id = t.id
      WHERE ta.teacher_id = $1
    `;
    const params = [req.params.teacherId];

    if (startDate && endDate) {
      query_text += ` AND ta.attendance_date BETWEEN $2 AND $3`;
      params.push(startDate, endDate);
    }

    query_text += ` ORDER BY ta.attendance_date DESC`;

    const result = await query(query_text, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark attendance for a teacher
router.post('/attendance', async (req, res) => {
  const { teacher_id, attendance_date, status, check_in_time, check_out_time, remarks, marked_by_id } = req.body;
  
  try {
    // Calculate working hours if check-in and check-out times are provided
    let working_hours = null;
    if (check_in_time && check_out_time) {
      // Convert times to minutes and calculate difference
      const [inHours, inMinutes] = check_in_time.split(':').map(Number);
      const [outHours, outMinutes] = check_out_time.split(':').map(Number);
      const inTotalMinutes = inHours * 60 + inMinutes;
      const outTotalMinutes = outHours * 60 + outMinutes;
      working_hours = (outTotalMinutes - inTotalMinutes) / 60;
    }

    const result = await query(
      `INSERT INTO teacher_attendance 
       (teacher_id, attendance_date, status, check_in_time, check_out_time, working_hours, remarks, marked_by_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [teacher_id, attendance_date, status, check_in_time, check_out_time, working_hours, remarks, marked_by_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update attendance
router.put('/attendance/:id', async (req, res) => {
  const { status, check_in_time, check_out_time, remarks } = req.body;
  
  try {
    // Calculate working hours if check-in and check-out times are provided
    let working_hours = null;
    if (check_in_time && check_out_time) {
      const [inHours, inMinutes] = check_in_time.split(':').map(Number);
      const [outHours, outMinutes] = check_out_time.split(':').map(Number);
      const inTotalMinutes = inHours * 60 + inMinutes;
      const outTotalMinutes = outHours * 60 + outMinutes;
      working_hours = (outTotalMinutes - inTotalMinutes) / 60;
    }

    const result = await query(
      `UPDATE teacher_attendance 
       SET status = $1, check_in_time = $2, check_out_time = $3, working_hours = $4, remarks = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 
       RETURNING *`,
      [status, check_in_time, check_out_time, working_hours, remarks, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete attendance record
router.delete('/attendance/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM teacher_attendance WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    res.json({ message: 'Attendance record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ATTENDANCE SUMMARY
// ==========================================

// Get attendance summary for a teacher (month/year)
router.get('/attendance-summary/teacher/:teacherId/:month/:year', async (req, res) => {
  try {
    const result = await query(`
      SELECT tas.*, t.full_name as teacher_name
      FROM teacher_attendance_summary tas
      LEFT JOIN teachers t ON tas.teacher_id = t.id
      WHERE tas.teacher_id = $1 AND tas.month = $2 AND tas.year = $3
    `, [req.params.teacherId, req.params.month, req.params.year]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Summary not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Calculate and update attendance summary for all teachers (call monthly)
router.post('/attendance-summary/calculate/:month/:year', async (req, res) => {
  const month = req.params.month;
  const year = req.params.year;
  
  try {
    // Get all teachers
    const teachersResult = await query('SELECT id FROM teachers WHERE status = $1', ['active']);
    
    for (const teacher of teachersResult.rows) {
      const summaryResult = await query(`
        SELECT 
          COUNT(*) as total_days,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
          SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) as leave_days,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_days,
          SUM(working_hours) as total_working_hours
        FROM teacher_attendance
        WHERE teacher_id = $1 AND EXTRACT(MONTH FROM attendance_date) = $2 AND EXTRACT(YEAR FROM attendance_date) = $3
      `, [teacher.id, month, year]);

      const summary = summaryResult.rows[0];
      const present = summary.present_days || 0;
      const total = summary.total_days || 1; // Avoid division by zero
      const percentage = (present / total * 100).toFixed(2);

      await query(`
        INSERT INTO teacher_attendance_summary 
        (teacher_id, month, year, total_days, present_days, absent_days, leave_days, late_days, total_working_hours, attendance_percentage)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (teacher_id, month, year) DO UPDATE SET
        total_days = $4, present_days = $5, absent_days = $6, leave_days = $7, late_days = $8, 
        total_working_hours = $9, attendance_percentage = $10, updated_at = CURRENT_TIMESTAMP
      `, [teacher.id, month, year, summary.total_days, present, summary.absent_days, summary.leave_days, summary.late_days, summary.total_working_hours || 0, percentage]);
    }

    res.json({ message: `Attendance summary calculated for month ${month}/${year}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
