import { Router } from 'express';
import { query } from '../db.js';

export const departmentsRouter = Router();

// ── Departments ───────────────────────────────────────────────────────────────

departmentsRouter.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT d.*,
              COUNT(e.id)::int AS employee_count,
              COUNT(des.id)::int AS designation_count
       FROM hr_departments d
       LEFT JOIN hr_employees e ON e.department_id = d.id AND NOT e.is_deleted
       LEFT JOIN hr_designations des ON des.department_id = d.id AND des.is_active
       GROUP BY d.id
       ORDER BY d.name`
    );
    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

departmentsRouter.post('/', async (req, res, next) => {
  try {
    const { name, code, head_name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Department name is required' });
    const r = await query(
      `INSERT INTO hr_departments (name, code, head_name, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), code?.trim() || null, head_name?.trim() || null, description?.trim() || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

departmentsRouter.put('/:id', async (req, res, next) => {
  try {
    const { name, code, head_name, description, is_active } = req.body;
    const r = await query(
      `UPDATE hr_departments SET name=$1, code=$2, head_name=$3, description=$4, is_active=$5,
       updated_at=CURRENT_TIMESTAMP WHERE id=$6 RETURNING *`,
      [name, code || null, head_name || null, description || null,
       is_active !== false, Number(req.params.id)]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Department not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

departmentsRouter.delete('/:id', async (req, res, next) => {
  try {
    const check = await query(
      'SELECT COUNT(*)::int AS cnt FROM hr_employees WHERE department_id=$1 AND NOT is_deleted',
      [Number(req.params.id)]
    );
    if (check.rows[0].cnt > 0)
      return res.status(400).json({ message: 'Cannot delete department with active employees' });
    await query('DELETE FROM hr_departments WHERE id=$1', [Number(req.params.id)]);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// ── Designations ──────────────────────────────────────────────────────────────

departmentsRouter.get('/designations', async (req, res, next) => {
  try {
    const { department_id } = req.query;
    const params = [];
    let where = 'WHERE des.is_active';
    if (department_id) { params.push(Number(department_id)); where += ` AND des.department_id = $${params.length}`; }
    const r = await query(
      `SELECT des.*, d.name AS department_name,
              COUNT(e.id)::int AS employee_count
       FROM hr_designations des
       LEFT JOIN hr_departments d ON d.id = des.department_id
       LEFT JOIN hr_employees e ON e.designation_id = des.id AND NOT e.is_deleted
       ${where}
       GROUP BY des.id, d.name
       ORDER BY d.name, des.title`,
      params
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

departmentsRouter.post('/designations', async (req, res, next) => {
  try {
    const { title, department_id, grade } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'Designation title is required' });
    const r = await query(
      `INSERT INTO hr_designations (title, department_id, grade)
       VALUES ($1, $2, $3) RETURNING *`,
      [title.trim(), department_id || null, grade?.trim() || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

departmentsRouter.put('/designations/:id', async (req, res, next) => {
  try {
    const { title, department_id, grade, is_active } = req.body;
    const r = await query(
      `UPDATE hr_designations SET title=$1, department_id=$2, grade=$3, is_active=$4
       WHERE id=$5 RETURNING *`,
      [title, department_id || null, grade || null, is_active !== false, Number(req.params.id)]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Designation not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

departmentsRouter.delete('/designations/:id', async (req, res, next) => {
  try {
    const check = await query(
      'SELECT COUNT(*)::int AS cnt FROM hr_employees WHERE designation_id=$1 AND NOT is_deleted',
      [Number(req.params.id)]
    );
    if (check.rows[0].cnt > 0)
      return res.status(400).json({ message: 'Cannot delete designation with active employees' });
    await query('DELETE FROM hr_designations WHERE id=$1', [Number(req.params.id)]);
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});
