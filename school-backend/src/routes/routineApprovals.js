import { Router } from 'express';
import { query } from '../db.js';

export const routineApprovalsRouter = Router();

// A logged-in user may approve a routine solo if they are, in the HR
// database, an active employee in the Education department holding the
// Head Teacher or Assistant Head Teacher designation. Matched the same way
// hr-backend's own employee list resolves a user identity: by linked_user_id,
// falling back to matching the users table on email.
async function findApproverIdentity(userId) {
  const r = await query(
    `SELECT e.id, e.full_name, des.title
     FROM hr_employees e
     LEFT JOIN hr_departments d ON d.id = e.department_id
     LEFT JOIN hr_designations des ON des.id = e.designation_id
     LEFT JOIN users u ON LOWER(u.email) = LOWER(e.email)
     WHERE NOT e.is_deleted
       AND d.name = 'Education'
       AND des.title ILIKE ANY (ARRAY['Head Teacher', 'Assistant Head Teacher'])
       AND COALESCE(e.linked_user_id, u.id) = $1`,
    [userId]
  );
  return r.rows[0] || null;
}

routineApprovalsRouter.get('/', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT a.*, c.name AS class_name FROM sc_routine_approvals a
       LEFT JOIN sc_classes c ON c.id = a.class_id
       ORDER BY (a.class_id IS NULL) DESC, c.name`
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

routineApprovalsRouter.get('/status', async (req, res, next) => {
  try {
    const { classId } = req.query;
    const r = await query(
      `SELECT * FROM sc_routine_approvals WHERE COALESCE(class_id, -1) = COALESCE($1, -1)`,
      [classId ? Number(classId) : null]
    );
    res.json(r.rows[0] || null);
  } catch (err) { next(err); }
});

// Submit (or re-submit after an edit) a class's — or the whole school's —
// routine for approval. Re-submitting always resets to pending, since an
// edited routine needs a fresh sign-off.
routineApprovalsRouter.post('/submit', async (req, res, next) => {
  try {
    const { class_id } = req.body || {};
    const r = await query(
      `INSERT INTO sc_routine_approvals (class_id, status, created_by)
       VALUES ($1, 'pending', $2)
       ON CONFLICT (COALESCE(class_id, -1)) DO UPDATE SET
         status = 'pending', approved_by_employee_id = NULL, approved_by_name = NULL,
         approved_by_title = NULL, approved_at = NULL, rejected_reason = NULL,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [class_id ? Number(class_id) : null, req.user?.userId || null]
    );
    res.status(201).json({ id: r.rows[0].id });
  } catch (err) { next(err); }
});

routineApprovalsRouter.patch('/:id/approve', async (req, res, next) => {
  try {
    const approver = await findApproverIdentity(req.user?.userId);
    if (!approver) {
      return res.status(403).json({ message: 'Only the Head Teacher or Assistant Head Teacher can approve a routine' });
    }
    const r = await query(
      `UPDATE sc_routine_approvals SET status = 'approved',
         approved_by_employee_id = $1, approved_by_name = $2, approved_by_title = $3,
         approved_at = CURRENT_TIMESTAMP, rejected_reason = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [approver.id, approver.full_name, approver.title, Number(req.params.id)]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Approval record not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});

routineApprovalsRouter.patch('/:id/reject', async (req, res, next) => {
  try {
    const approver = await findApproverIdentity(req.user?.userId);
    if (!approver) {
      return res.status(403).json({ message: 'Only the Head Teacher or Assistant Head Teacher can reject a routine' });
    }
    const { reason } = req.body || {};
    const r = await query(
      `UPDATE sc_routine_approvals SET status = 'rejected',
         approved_by_employee_id = $1, approved_by_name = $2, approved_by_title = $3,
         approved_at = CURRENT_TIMESTAMP, rejected_reason = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [approver.id, approver.full_name, approver.title, reason || null, Number(req.params.id)]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Approval record not found' });
    res.json(r.rows[0]);
  } catch (err) { next(err); }
});
