import { Router } from 'express';
import { query } from '../db.js';

export const employeesRouter = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function nextEmployeeCode() {
  const r = await query(
    `SELECT employee_code FROM hr_employees ORDER BY id DESC LIMIT 1`
  );
  let seq = 1;
  if (r.rows.length) {
    const last = r.rows[0].employee_code;
    const match = last.match(/(\d+)$/);
    if (match) seq = parseInt(match[1], 10) + 1;
  }
  const ym = new Date().toISOString().slice(0, 7).replace('-', '');
  return `EMP-${ym}-${String(seq).padStart(4, '0')}`;
}

// ── Employee List ─────────────────────────────────────────────────────────────

employeesRouter.get('/', async (req, res, next) => {
  try {
    const {
      status, department_id, employee_type, search,
      limit = 50, offset = 0,
    } = req.query;

    const params = [];
    const clauses = ['NOT e.is_deleted'];

    if (status)        { params.push(status);           clauses.push(`e.employment_status = $${params.length}`); }
    if (department_id) { params.push(Number(department_id)); clauses.push(`e.department_id = $${params.length}`); }
    if (employee_type) { params.push(employee_type);    clauses.push(`e.employee_type = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(e.full_name ILIKE $${params.length} OR e.employee_code ILIKE $${params.length} OR e.mobile ILIKE $${params.length} OR e.email ILIKE $${params.length})`);
    }

    const where = `WHERE ${clauses.join(' AND ')}`;

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM hr_employees e ${where}`, params
    );

    params.push(Math.min(Number(limit), 200), Math.max(Number(offset), 0));

    const result = await query(
      `SELECT e.id, e.employee_code, e.full_name, e.photo, e.gender, e.mobile, e.email,
              e.employee_type, e.employment_status, e.joining_date, e.work_email,
              e.basic_salary::float8, e.payment_method,
              d.name AS department_name, des.title AS designation_title,
              m.full_name AS manager_name
       FROM hr_employees e
       LEFT JOIN hr_departments d   ON d.id = e.department_id
       LEFT JOIN hr_designations des ON des.id = e.designation_id
       LEFT JOIN hr_employees m     ON m.id = e.reporting_manager_id
       ${where}
       ORDER BY e.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: result.rows, total: countResult.rows[0].total });
  } catch (err) { next(err); }
});

// ── Employee Detail ───────────────────────────────────────────────────────────

employeesRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [empResult, docsResult] = await Promise.all([
      query(
        `SELECT e.*,
                e.basic_salary::float8,
                d.name AS department_name, des.title AS designation_title,
                m.full_name AS manager_name, m.employee_code AS manager_code
         FROM hr_employees e
         LEFT JOIN hr_departments  d   ON d.id = e.department_id
         LEFT JOIN hr_designations des ON des.id = e.designation_id
         LEFT JOIN hr_employees    m   ON m.id = e.reporting_manager_id
         WHERE e.id = $1 AND NOT e.is_deleted`,
        [id]
      ),
      query(
        `SELECT id, document_type, file_name, file_size, uploaded_by_name, created_at
         FROM hr_employee_documents WHERE employee_id = $1 ORDER BY created_at DESC`,
        [id]
      ),
    ]);

    if (!empResult.rows.length) return res.status(404).json({ message: 'Employee not found' });
    res.json({ ...empResult.rows[0], documents: docsResult.rows });
  } catch (err) { next(err); }
});

// ── Create Employee ───────────────────────────────────────────────────────────

employeesRouter.post('/', async (req, res, next) => {
  try {
    const {
      full_name, photo, gender, date_of_birth, blood_group,
      national_id, passport_number, mobile, email,
      present_address, permanent_address,
      emergency_contact_name, emergency_contact_number, emergency_contact_relation,
      employee_type, department_id, designation_id, reporting_manager_id,
      joining_date, confirmation_date, employment_status,
      office_location, work_email, employee_category,
      basic_salary, salary_grade, payment_method,
      bank_name, bank_branch, account_number, routing_number,
      mobile_wallet_number, tax_id, linked_user_id,
    } = req.body;

    if (!full_name?.trim()) return res.status(400).json({ message: 'Full name is required' });

    const employee_code = await nextEmployeeCode();

    const r = await query(
      `INSERT INTO hr_employees (
         employee_code, full_name, photo, gender, date_of_birth, blood_group,
         national_id, passport_number, mobile, email,
         present_address, permanent_address,
         emergency_contact_name, emergency_contact_number, emergency_contact_relation,
         employee_type, department_id, designation_id, reporting_manager_id,
         joining_date, confirmation_date, employment_status,
         office_location, work_email, employee_category,
         basic_salary, salary_grade, payment_method,
         bank_name, bank_branch, account_number, routing_number,
         mobile_wallet_number, tax_id, linked_user_id
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
         $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,
         $29,$30,$31,$32,$33,$34,$35
       ) RETURNING id, employee_code, full_name, employment_status`,
      [
        employee_code, full_name.trim(), photo || null, gender || null,
        date_of_birth || null, blood_group || null,
        national_id || null, passport_number || null, mobile || null, email || null,
        present_address || null, permanent_address || null,
        emergency_contact_name || null, emergency_contact_number || null, emergency_contact_relation || null,
        employee_type || 'Permanent', department_id || null, designation_id || null,
        reporting_manager_id || null,
        joining_date || null, confirmation_date || null,
        employment_status || 'Probation',
        office_location || null, work_email || null, employee_category || null,
        Number(basic_salary || 0), salary_grade || null, payment_method || 'Bank',
        bank_name || null, bank_branch || null, account_number || null,
        routing_number || null, mobile_wallet_number || null,
        tax_id || null, linked_user_id || null,
      ]
    );

    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

// ── Update Employee ───────────────────────────────────────────────────────────

employeesRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const {
      full_name, photo, gender, date_of_birth, blood_group,
      national_id, passport_number, mobile, email,
      present_address, permanent_address,
      emergency_contact_name, emergency_contact_number, emergency_contact_relation,
      employee_type, department_id, designation_id, reporting_manager_id,
      joining_date, confirmation_date, employment_status,
      office_location, work_email, employee_category,
      basic_salary, salary_grade, payment_method,
      bank_name, bank_branch, account_number, routing_number,
      mobile_wallet_number, tax_id, linked_user_id,
    } = req.body;

    const r = await query(
      `UPDATE hr_employees SET
         full_name=$1, photo=$2, gender=$3, date_of_birth=$4, blood_group=$5,
         national_id=$6, passport_number=$7, mobile=$8, email=$9,
         present_address=$10, permanent_address=$11,
         emergency_contact_name=$12, emergency_contact_number=$13, emergency_contact_relation=$14,
         employee_type=$15, department_id=$16, designation_id=$17, reporting_manager_id=$18,
         joining_date=$19, confirmation_date=$20, employment_status=$21,
         office_location=$22, work_email=$23, employee_category=$24,
         basic_salary=$25, salary_grade=$26, payment_method=$27,
         bank_name=$28, bank_branch=$29, account_number=$30, routing_number=$31,
         mobile_wallet_number=$32, tax_id=$33, linked_user_id=$34,
         updated_at=CURRENT_TIMESTAMP
       WHERE id=$35 AND NOT is_deleted
       RETURNING id, employee_code, full_name, employment_status`,
      [
        full_name, photo || null, gender || null, date_of_birth || null, blood_group || null,
        national_id || null, passport_number || null, mobile || null, email || null,
        present_address || null, permanent_address || null,
        emergency_contact_name || null, emergency_contact_number || null, emergency_contact_relation || null,
        employee_type || 'Permanent', department_id || null, designation_id || null,
        reporting_manager_id || null,
        joining_date || null, confirmation_date || null,
        employment_status || 'Active',
        office_location || null, work_email || null, employee_category || null,
        Number(basic_salary || 0), salary_grade || null, payment_method || 'Bank',
        bank_name || null, bank_branch || null, account_number || null,
        routing_number || null, mobile_wallet_number || null,
        tax_id || null, linked_user_id || null,
        id,
      ]
    );

    if (!r.rows.length) return res.status(404).json({ message: 'Employee not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

// ── Soft Delete ───────────────────────────────────────────────────────────────

employeesRouter.delete('/:id', async (req, res, next) => {
  try {
    const r = await query(
      `UPDATE hr_employees SET is_deleted=true, updated_at=CURRENT_TIMESTAMP
       WHERE id=$1 AND NOT is_deleted RETURNING id`,
      [Number(req.params.id)]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Employee not found' });
    res.json({ message: 'Employee removed' });
  } catch (err) { next(err); }
});

// ── Documents ─────────────────────────────────────────────────────────────────

employeesRouter.get('/:id/documents', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT id, document_type, file_name, file_size, uploaded_by_name, created_at
       FROM hr_employee_documents WHERE employee_id=$1 ORDER BY created_at DESC`,
      [Number(req.params.id)]
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

employeesRouter.post('/:id/documents', async (req, res, next) => {
  try {
    const { document_type, file_name, file_data, file_size } = req.body;
    if (!document_type || !file_name || !file_data)
      return res.status(400).json({ message: 'document_type, file_name, file_data are required' });

    const uploaded_by_name = req.user?.username || 'System';
    const r = await query(
      `INSERT INTO hr_employee_documents
         (employee_id, document_type, file_name, file_data, file_size, uploaded_by_name)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, document_type, file_name, file_size, uploaded_by_name, created_at`,
      [Number(req.params.id), document_type, file_name, file_data,
       file_size || null, uploaded_by_name]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { next(err); }
});

employeesRouter.get('/:id/documents/:docId/download', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT file_name, file_data FROM hr_employee_documents WHERE id=$1 AND employee_id=$2`,
      [Number(req.params.docId), Number(req.params.id)]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Document not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

employeesRouter.delete('/:id/documents/:docId', async (req, res, next) => {
  try {
    await query(
      'DELETE FROM hr_employee_documents WHERE id=$1 AND employee_id=$2',
      [Number(req.params.docId), Number(req.params.id)]
    );
    res.json({ message: 'Document deleted' });
  } catch (err) { next(err); }
});

// ── Salary Components (lookup) ────────────────────────────────────────────────

employeesRouter.get('/meta/salary-components', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT * FROM hr_salary_components WHERE is_active ORDER BY component_type, name`
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});
