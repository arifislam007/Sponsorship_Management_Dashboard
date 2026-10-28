import { Router } from 'express';
import { query } from '../db.js';

export const teachersRouter = Router();

// Cross-service read against hr_employees — same shared Postgres database as
// the HR service (same pattern as accounting.js's /employees/signatory and
// the NPO module's HR cross-links), so a School-module user doesn't need HR
// module access just to pick a teacher for the routine. Scoped to the
// Education department and active staff, same filters the Routine tab
// applied client-side when it called hr-backend directly.
teachersRouter.get('/', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT e.id, e.full_name, e.mobile, des.title AS designation_title, d.name AS department_name
       FROM hr_employees e
       LEFT JOIN hr_departments d ON d.id = e.department_id
       LEFT JOIN hr_designations des ON des.id = e.designation_id
       WHERE NOT e.is_deleted AND e.employment_status = 'Active' AND d.name = 'Education'
       ORDER BY e.full_name`
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});
