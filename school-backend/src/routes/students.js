import { Router } from 'express';
import { query } from '../db.js';

export const studentsRouter = Router();

studentsRouter.get('/', async (req, res, next) => {
  try {
    const { class_id, search, active } = req.query;
    const params = [];
    const clauses = ['s.is_active = true'];

    if (class_id) { params.push(Number(class_id)); clauses.push(`s.class_id = $${params.length}`); }
    if (search) { params.push(`%${search}%`); clauses.push(`(s.full_name ILIKE $${params.length} OR s.student_code ILIKE $${params.length})`); }
    if (active === 'false') clauses[0] = 's.is_active = false';

    const r = await query(
      `SELECT s.*, c.name AS class_name
       FROM sc_students s
       LEFT JOIN sc_classes c ON c.id = s.class_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY c.name, s.full_name`,
      params
    );
    res.json({ data: r.rows, total: r.rows.length });
  } catch (err) { next(err); }
});

studentsRouter.post('/', async (req, res, next) => {
  try {
    const { full_name, class_id, gender, date_of_birth, guardian_name, guardian_mobile } = req.body;
    if (!full_name?.trim()) return res.status(400).json({ message: 'Full name is required' });

    const last = await query(`SELECT student_code FROM sc_students ORDER BY id DESC LIMIT 1`);
    let seq = 1;
    if (last.rows.length) {
      const m = last.rows[0].student_code?.match(/(\d+)$/);
      if (m) seq = parseInt(m[1], 10) + 1;
    }
    const ym = new Date().toISOString().slice(0, 7).replace('-', '');
    const student_code = `STU-${ym}-${String(seq).padStart(4, '0')}`;

    const r = await query(
      `INSERT INTO sc_students (student_code, full_name, class_id, gender, date_of_birth, guardian_name, guardian_mobile)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [student_code, full_name.trim(), class_id || null, gender || null,
       date_of_birth || null, guardian_name || null, guardian_mobile || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

studentsRouter.put('/:id', async (req, res, next) => {
  try {
    const { full_name, class_id, gender, date_of_birth, guardian_name, guardian_mobile, is_active } = req.body;
    const r = await query(
      `UPDATE sc_students SET full_name=$1, class_id=$2, gender=$3, date_of_birth=$4,
       guardian_name=$5, guardian_mobile=$6, is_active=$7
       WHERE id=$8 RETURNING *`,
      [full_name, class_id || null, gender || null, date_of_birth || null,
       guardian_name || null, guardian_mobile || null,
       is_active !== undefined ? is_active : true,
       Number(req.params.id)]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Student not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});
