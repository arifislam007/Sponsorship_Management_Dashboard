import { Router } from 'express';
import { query } from '../db.js';

export const payrollRouter = Router();

// ── List Payrolls ─────────────────────────────────────────────────────────────

payrollRouter.get('/', async (req, res, next) => {
  try {
    const { payroll_month, employee_id, payment_status, search, limit = 100, offset = 0 } = req.query;
    const params = [];
    const clauses = [];

    if (payroll_month)   { params.push(payroll_month);       clauses.push(`p.payroll_month = $${params.length}`); }
    if (employee_id)     { params.push(Number(employee_id)); clauses.push(`p.employee_id = $${params.length}`); }
    if (payment_status)  { params.push(payment_status);      clauses.push(`p.payment_status = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(e.full_name ILIKE $${params.length} OR e.employee_code ILIKE $${params.length})`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM hr_payrolls p
       JOIN hr_employees e ON e.id = p.employee_id ${where}`, params
    );

    params.push(Math.min(Number(limit), 500), Math.max(Number(offset), 0));

    const result = await query(
      `SELECT p.*,
              p.basic_salary::float8, p.total_allowance::float8,
              p.total_deduction::float8, p.net_salary::float8,
              e.full_name AS employee_name, e.employee_code,
              d.name AS department_name, des.title AS designation_title
       FROM hr_payrolls p
       JOIN hr_employees e ON e.id = p.employee_id
       LEFT JOIN hr_departments d ON d.id = e.department_id
       LEFT JOIN hr_designations des ON des.id = e.designation_id
       ${where}
       ORDER BY p.payroll_month DESC, e.full_name
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: result.rows, total: countResult.rows[0].total });
  } catch (err) { next(err); }
});

// ── Payroll Detail ────────────────────────────────────────────────────────────

payrollRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [payResult, itemsResult] = await Promise.all([
      query(
        `SELECT p.*,
                p.basic_salary::float8, p.total_allowance::float8,
                p.total_deduction::float8, p.net_salary::float8,
                e.full_name AS employee_name, e.employee_code,
                e.mobile, e.email, e.work_email, e.joining_date, e.payment_method AS emp_payment_method,
                e.bank_name, e.account_number,
                d.name AS department_name, des.title AS designation_title
         FROM hr_payrolls p
         JOIN hr_employees e ON e.id = p.employee_id
         LEFT JOIN hr_departments d ON d.id = e.department_id
         LEFT JOIN hr_designations des ON des.id = e.designation_id
         WHERE p.id = $1`,
        [id]
      ),
      query(
        `SELECT *, amount::float8 FROM hr_payroll_items WHERE payroll_id=$1 ORDER BY component_type, id`,
        [id]
      ),
    ]);

    if (!payResult.rows.length) return res.status(404).json({ message: 'Payroll not found' });
    res.json({ ...payResult.rows[0], items: itemsResult.rows });
  } catch (err) { next(err); }
});

// ── Create Single Payroll ─────────────────────────────────────────────────────

payrollRouter.post('/', async (req, res, next) => {
  try {
    const {
      employee_id, payroll_month, items = [], notes,
      payment_method, payment_reference,
    } = req.body;

    if (!employee_id || !payroll_month)
      return res.status(400).json({ message: 'employee_id and payroll_month are required' });

    // Get employee basic salary
    const empResult = await query(
      `SELECT id, full_name, basic_salary::float8 FROM hr_employees WHERE id=$1 AND NOT is_deleted`,
      [Number(employee_id)]
    );
    if (!empResult.rows.length) return res.status(404).json({ message: 'Employee not found' });
    const emp = empResult.rows[0];

    const created_by_name = req.user?.username || 'System';

    // Build items: if none provided, default to basic salary only
    const allItems = items.length > 0 ? items : [
      { component_name: 'Basic Salary', component_type: 'Earning', amount: emp.basic_salary },
    ];

    const totalEarnings  = allItems.filter(i => i.component_type === 'Earning').reduce((s, i) => s + Number(i.amount), 0);
    const totalDeduction = allItems.filter(i => i.component_type === 'Deduction').reduce((s, i) => s + Number(i.amount), 0);
    const basicItem      = allItems.find(i => i.component_name === 'Basic Salary');
    const basicSalary    = basicItem ? Number(basicItem.amount) : emp.basic_salary;
    const totalAllowance = totalEarnings - basicSalary;
    const netSalary      = totalEarnings - totalDeduction;

    const payResult = await query(
      `INSERT INTO hr_payrolls
         (employee_id, payroll_month, basic_salary, total_allowance, total_deduction, net_salary,
          payment_method, payment_reference, notes, created_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        Number(employee_id), payroll_month,
        basicSalary, Math.max(totalAllowance, 0), totalDeduction, netSalary,
        payment_method || null, payment_reference || null,
        notes || null, created_by_name,
      ]
    );

    const payrollId = payResult.rows[0].id;
    for (const item of allItems) {
      await query(
        `INSERT INTO hr_payroll_items (payroll_id, component_name, component_type, amount)
         VALUES ($1,$2,$3,$4)`,
        [payrollId, item.component_name, item.component_type, Number(item.amount)]
      );
    }

    res.status(201).json({ id: payrollId, message: 'Payroll created' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Payroll already exists for this employee and month' });
    next(err);
  }
});

// ── Bulk Generate ─────────────────────────────────────────────────────────────

payrollRouter.post('/bulk-generate', async (req, res, next) => {
  try {
    const { payroll_month } = req.body;
    if (!payroll_month) return res.status(400).json({ message: 'payroll_month is required (YYYY-MM)' });

    const created_by_name = req.user?.username || 'System';

    const empResult = await query(
      `SELECT id, basic_salary::float8 FROM hr_employees
       WHERE NOT is_deleted AND employment_status IN ('Active','Probation')`
    );

    let created = 0, skipped = 0;

    for (const emp of empResult.rows) {
      try {
        const payRow = await query(
          `INSERT INTO hr_payrolls
             (employee_id, payroll_month, basic_salary, total_allowance, total_deduction, net_salary, created_by_name)
           VALUES ($1,$2,$3,0,0,$3,$4)
           ON CONFLICT (employee_id, payroll_month) DO NOTHING
           RETURNING id`,
          [emp.id, payroll_month, emp.basic_salary, created_by_name]
        );
        if (payRow.rows.length) {
          await query(
            `INSERT INTO hr_payroll_items (payroll_id, component_name, component_type, amount)
             VALUES ($1,'Basic Salary','Earning',$2)`,
            [payRow.rows[0].id, emp.basic_salary]
          );
          created++;
        } else {
          skipped++;
        }
      } catch { skipped++; }
    }

    res.json({ message: `Payroll generated for ${payroll_month}`, created, skipped });
  } catch (err) { next(err); }
});

// ── Update Payroll Items ──────────────────────────────────────────────────────

payrollRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { items = [], notes, payment_method, payment_reference } = req.body;

    const existing = await query(
      `SELECT payment_status FROM hr_payrolls WHERE id=$1`, [id]
    );
    if (!existing.rows.length) return res.status(404).json({ message: 'Payroll not found' });
    if (existing.rows[0].payment_status !== 'Draft')
      return res.status(400).json({ message: 'Only Draft payrolls can be edited' });

    const totalEarnings  = items.filter(i => i.component_type === 'Earning').reduce((s, i) => s + Number(i.amount), 0);
    const totalDeduction = items.filter(i => i.component_type === 'Deduction').reduce((s, i) => s + Number(i.amount), 0);
    const basicItem      = items.find(i => i.component_name === 'Basic Salary');
    const basicSalary    = basicItem ? Number(basicItem.amount) : 0;
    const totalAllowance = totalEarnings - basicSalary;
    const netSalary      = totalEarnings - totalDeduction;

    await query(`DELETE FROM hr_payroll_items WHERE payroll_id=$1`, [id]);
    for (const item of items) {
      await query(
        `INSERT INTO hr_payroll_items (payroll_id, component_name, component_type, amount)
         VALUES ($1,$2,$3,$4)`,
        [id, item.component_name, item.component_type, Number(item.amount)]
      );
    }

    await query(
      `UPDATE hr_payrolls SET
         basic_salary=$1, total_allowance=$2, total_deduction=$3, net_salary=$4,
         notes=$5, payment_method=$6, payment_reference=$7, updated_at=CURRENT_TIMESTAMP
       WHERE id=$8`,
      [basicSalary, Math.max(totalAllowance, 0), totalDeduction, netSalary,
       notes || null, payment_method || null, payment_reference || null, id]
    );

    res.json({ message: 'Payroll updated' });
  } catch (err) { next(err); }
});

// ── Approve ───────────────────────────────────────────────────────────────────

payrollRouter.post('/:id/approve', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const approved_by_name = req.user?.username || 'System';

    const r = await query(
      `UPDATE hr_payrolls SET payment_status='Approved', approved_by_name=$1,
       approved_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
       WHERE id=$2 AND payment_status='Draft' RETURNING id`,
      [approved_by_name, id]
    );
    if (!r.rows.length) return res.status(400).json({ message: 'Payroll not in Draft status' });
    res.json({ message: 'Payroll approved' });
  } catch (err) { next(err); }
});

// ── Mark Paid ─────────────────────────────────────────────────────────────────

payrollRouter.post('/:id/pay', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { payment_date, payment_method, payment_reference } = req.body;

    const r = await query(
      `UPDATE hr_payrolls SET
         payment_status='Paid',
         payment_date=COALESCE($1::date, CURRENT_DATE),
         payment_method=COALESCE($2, payment_method),
         payment_reference=COALESCE($3, payment_reference),
         updated_at=CURRENT_TIMESTAMP
       WHERE id=$4 AND payment_status='Approved' RETURNING id`,
      [payment_date || null, payment_method || null, payment_reference || null, id]
    );
    if (!r.rows.length) return res.status(400).json({ message: 'Payroll not in Approved status' });
    res.json({ message: 'Payroll marked as paid' });
  } catch (err) { next(err); }
});

// ── Revert to Draft ───────────────────────────────────────────────────────────

payrollRouter.post('/:id/revert', async (req, res, next) => {
  try {
    const r = await query(
      `UPDATE hr_payrolls SET payment_status='Draft', approved_by_name=NULL,
       approved_at=NULL, updated_at=CURRENT_TIMESTAMP
       WHERE id=$1 AND payment_status='Approved' RETURNING id`,
      [Number(req.params.id)]
    );
    if (!r.rows.length) return res.status(400).json({ message: 'Can only revert Approved payrolls' });
    res.json({ message: 'Reverted to Draft' });
  } catch (err) { next(err); }
});

// ── Delete Draft ──────────────────────────────────────────────────────────────

payrollRouter.delete('/:id', async (req, res, next) => {
  try {
    const r = await query(
      `DELETE FROM hr_payrolls WHERE id=$1 AND payment_status='Draft' RETURNING id`,
      [Number(req.params.id)]
    );
    if (!r.rows.length) return res.status(400).json({ message: 'Only Draft payrolls can be deleted' });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
});

// ── Salary Slip Data ──────────────────────────────────────────────────────────

payrollRouter.get('/:id/slip', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [payResult, itemsResult] = await Promise.all([
      query(
        `SELECT p.*,
                p.basic_salary::float8, p.total_allowance::float8,
                p.total_deduction::float8, p.net_salary::float8,
                e.full_name AS employee_name, e.employee_code,
                e.mobile, e.joining_date, e.payment_method AS emp_payment_method,
                e.bank_name, e.account_number, e.tax_id,
                d.name AS department_name, des.title AS designation_title
         FROM hr_payrolls p
         JOIN hr_employees e ON e.id = p.employee_id
         LEFT JOIN hr_departments d ON d.id = e.department_id
         LEFT JOIN hr_designations des ON des.id = e.designation_id
         WHERE p.id = $1`,
        [id]
      ),
      query(
        `SELECT component_name, component_type, amount::float8
         FROM hr_payroll_items WHERE payroll_id=$1 ORDER BY component_type DESC, id`,
        [id]
      ),
    ]);

    if (!payResult.rows.length) return res.status(404).json({ message: 'Payroll not found' });
    const slip = { ...payResult.rows[0], items: itemsResult.rows };
    const earnings   = itemsResult.rows.filter(i => i.component_type === 'Earning');
    const deductions = itemsResult.rows.filter(i => i.component_type === 'Deduction');
    res.json({ ...slip, earnings, deductions });
  } catch (err) { next(err); }
});

// ── Reports ───────────────────────────────────────────────────────────────────

payrollRouter.get('/reports/salary-register', async (req, res, next) => {
  try {
    const { payroll_month, department_id } = req.query;
    const params = [];
    const clauses = [];

    if (payroll_month)   { params.push(payroll_month);          clauses.push(`p.payroll_month = $${params.length}`); }
    if (department_id)   { params.push(Number(department_id));  clauses.push(`e.department_id = $${params.length}`); }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const r = await query(
      `SELECT p.payroll_month, p.payment_status, p.payment_date,
              p.basic_salary::float8, p.total_allowance::float8,
              p.total_deduction::float8, p.net_salary::float8,
              e.employee_code, e.full_name AS employee_name,
              d.name AS department_name, des.title AS designation_title
       FROM hr_payrolls p
       JOIN hr_employees e ON e.id = p.employee_id
       LEFT JOIN hr_departments d ON d.id = e.department_id
       LEFT JOIN hr_designations des ON des.id = e.designation_id
       ${where}
       ORDER BY p.payroll_month DESC, e.full_name`,
      params
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});
