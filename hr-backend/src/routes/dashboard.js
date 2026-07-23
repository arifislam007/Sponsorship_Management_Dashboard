import { Router } from 'express';
import { query } from '../db.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', async (req, res, next) => {
  try {
    const [empStats, deptStats, payrollStats, recentJoiners, payrollThisMonth] = await Promise.all([
      query(`SELECT
               COUNT(*)::int AS total_employees,
               COUNT(*) FILTER (WHERE employment_status = 'Active')::int AS active_employees,
               COUNT(*) FILTER (WHERE employment_status = 'Probation')::int AS probation_employees,
               COUNT(*) FILTER (WHERE joining_date >= DATE_TRUNC('month', CURRENT_DATE))::int AS new_this_month
             FROM hr_employees WHERE NOT is_deleted`),

      query(`SELECT d.name, COUNT(e.id)::int AS employee_count
             FROM hr_departments d
             LEFT JOIN hr_employees e ON e.department_id = d.id AND NOT e.is_deleted
             WHERE d.is_active
             GROUP BY d.id, d.name
             ORDER BY employee_count DESC`),

      query(`SELECT
               COUNT(*)::int AS total_payrolls,
               COUNT(*) FILTER (WHERE payment_status = 'Paid')::int AS paid,
               COUNT(*) FILTER (WHERE payment_status = 'Approved')::int AS approved,
               COUNT(*) FILTER (WHERE payment_status = 'Draft')::int AS draft,
               COALESCE(SUM(net_salary) FILTER (WHERE payment_status = 'Paid'), 0)::float8 AS total_paid_amount
             FROM hr_payrolls`),

      query(`SELECT e.id, e.employee_code, e.full_name, e.joining_date,
                    d.name AS department_name, des.title AS designation_title
             FROM hr_employees e
             LEFT JOIN hr_departments d ON d.id = e.department_id
             LEFT JOIN hr_designations des ON des.id = e.designation_id
             WHERE NOT e.is_deleted
             ORDER BY e.joining_date DESC NULLS LAST, e.created_at DESC
             LIMIT 5`),

      query(`SELECT
               TO_CHAR(CURRENT_DATE, 'YYYY-MM') AS month,
               COUNT(*)::int AS total_records,
               COALESCE(SUM(net_salary), 0)::float8 AS total_net,
               COALESCE(SUM(basic_salary), 0)::float8 AS total_basic,
               COALESCE(SUM(total_allowance), 0)::float8 AS total_allowance,
               COALESCE(SUM(total_deduction), 0)::float8 AS total_deduction
             FROM hr_payrolls
             WHERE payroll_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')`),
    ]);

    res.json({
      employee_stats:     empStats.rows[0],
      department_stats:   deptStats.rows,
      payroll_stats:      payrollStats.rows[0],
      recent_joiners:     recentJoiners.rows,
      payroll_this_month: payrollThisMonth.rows[0],
    });
  } catch (err) { next(err); }
});
