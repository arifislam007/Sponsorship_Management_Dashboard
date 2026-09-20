import { Router } from 'express';
import { query } from '../db.js';

// Self-scoped task access, mounted WITHOUT the Projects module gate — any
// authenticated user can see and update progress on tasks assigned to them,
// even without full Projects module permission (e.g. staff who receive an
// occasional task but don't manage projects).
export const myTasksRouter = Router();

async function recalcProjectProgress(projectId) {
  await query(
    `UPDATE pm_projects SET
       progress = (
         SELECT CASE WHEN COUNT(*) = 0 THEN 0
                ELSE ROUND(COUNT(*) FILTER (WHERE status = 'Completed') * 100.0 / COUNT(*))
                END
         FROM pm_tasks WHERE project_id = $1
       ),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [projectId]
  );
}

myTasksRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Authentication required' });

    const result = await query(
      `SELECT t.*, t.estimated_hours::float8 AS estimated_hours,
              p.name AS project_name, p.code AS project_code
       FROM pm_tasks t
       JOIN pm_projects p ON p.id = t.project_id
       WHERE t.assigned_user_id = $1 AND t.status != 'Completed'
       ORDER BY
         CASE t.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
         t.due_date ASC NULLS LAST,
         t.created_at DESC
       LIMIT 20`,
      [userId]
    );

    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

// Self-service status/progress update — restricted to the task's own assignee.
myTasksRouter.put('/:id', async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Authentication required' });

    const id = Number(req.params.id);
    const { status, progress } = req.body;

    const existing = await query('SELECT project_id, assigned_user_id FROM pm_tasks WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Task not found.' });
    if (existing.rows[0].assigned_user_id !== userId) {
      return res.status(403).json({ message: 'You can only update tasks assigned to you.' });
    }

    const result = await query(
      `UPDATE pm_tasks SET
         status = COALESCE($2, status),
         progress = COALESCE($3, progress),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *, estimated_hours::float8 AS estimated_hours`,
      [id, status || null, progress !== undefined ? Number(progress) : null]
    );

    await recalcProjectProgress(existing.rows[0].project_id);

    res.json(result.rows[0]);
  } catch (err) { next(err); }
});
