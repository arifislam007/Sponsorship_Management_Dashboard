import { Router } from 'express';
import { query } from '../db.js';

export const tasksRouter = Router();

// ── helper ────────────────────────────────────────────────────────────────────

async function logActivity(projectId, taskId, userId, userName, action, details) {
  await query(
    `INSERT INTO pm_activity_logs (project_id, task_id, user_id, user_name, action, details)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [projectId, taskId, userId, userName, action, details ? JSON.stringify(details) : null]
  );
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

tasksRouter.get('/', async (req, res, next) => {
  try {
    const { project_id, status, priority, assigned_user_id, overdue, search, limit = 100, offset = 0 } = req.query;
    const params = [];
    const clauses = [];

    if (project_id) { params.push(Number(project_id)); clauses.push(`t.project_id = $${params.length}`); }
    if (status) { params.push(status); clauses.push(`t.status = $${params.length}`); }
    if (priority) { params.push(priority); clauses.push(`t.priority = $${params.length}`); }
    if (assigned_user_id) { params.push(Number(assigned_user_id)); clauses.push(`t.assigned_user_id = $${params.length}`); }
    if (overdue === 'true') clauses.push(`t.due_date < CURRENT_DATE AND t.status != 'Completed'`);
    if (search) { params.push(`%${search}%`); clauses.push(`t.name ILIKE $${params.length}`); }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM pm_tasks t ${where}`,
      params
    );

    params.push(Math.min(Number(limit), 500), Math.max(Number(offset), 0));

    const result = await query(
      `SELECT t.*,
              t.estimated_hours::float8 AS estimated_hours,
              p.name AS project_name,
              p.code AS project_code,
              COUNT(c.id)::int AS comment_count
       FROM pm_tasks t
       JOIN pm_projects p ON p.id = t.project_id
       LEFT JOIN pm_task_comments c ON c.task_id = t.id
       ${where}
       GROUP BY t.id, p.name, p.code
       ORDER BY
         CASE t.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
         t.due_date ASC NULLS LAST,
         t.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: result.rows, total: countResult.rows[0].total });
  } catch (err) { next(err); }
});

tasksRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const tResult = await query(
      `SELECT t.*, t.estimated_hours::float8 AS estimated_hours,
              p.name AS project_name, p.code AS project_code
       FROM pm_tasks t
       JOIN pm_projects p ON p.id = t.project_id
       WHERE t.id = $1`,
      [id]
    );
    if (!tResult.rows.length) return res.status(404).json({ message: 'Task not found.' });

    const [comments, attachments, subtasks] = await Promise.all([
      query(`SELECT * FROM pm_task_comments WHERE task_id = $1 ORDER BY created_at`, [id]),
      query(
        `SELECT id, task_id, file_name, file_size, file_type, uploaded_by, uploaded_by_name, created_at
         FROM pm_task_attachments WHERE task_id = $1 ORDER BY created_at DESC`,
        [id]
      ),
      query(
        `SELECT id, name, status, priority, progress, assigned_user_name, due_date
         FROM pm_tasks WHERE parent_task_id = $1 ORDER BY created_at`,
        [id]
      ),
    ]);

    res.json({ ...tResult.rows[0], comments: comments.rows, attachments: attachments.rows, subtasks: subtasks.rows });
  } catch (err) { next(err); }
});

tasksRouter.post('/', async (req, res, next) => {
  try {
    const {
      project_id, parent_task_id, name, description, assigned_user_id,
      assigned_user_name, priority = 'Medium', due_date, estimated_hours,
      status = 'To Do', progress = 0
    } = req.body;

    if (!project_id || !name) return res.status(400).json({ message: 'project_id and name are required.' });

    const result = await query(
      `INSERT INTO pm_tasks
         (project_id, parent_task_id, name, description, assigned_user_id, assigned_user_name,
          priority, due_date, estimated_hours, status, progress, created_by, created_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *, estimated_hours::float8 AS estimated_hours`,
      [Number(project_id), parent_task_id || null, name, description || null,
       assigned_user_id || null, assigned_user_name || null, priority,
       due_date || null, estimated_hours ? Number(estimated_hours) : null,
       status, Number(progress), req.user?.userId || null, req.user?.username || null]
    );

    await logActivity(Number(project_id), result.rows[0].id, req.user?.userId, req.user?.username, 'task_created', { name, priority });
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

tasksRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const {
      name, description, assigned_user_id, assigned_user_name, priority,
      due_date, estimated_hours, status, progress
    } = req.body;

    const result = await query(
      `UPDATE pm_tasks SET
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         assigned_user_id = COALESCE($4, assigned_user_id),
         assigned_user_name = COALESCE($5, assigned_user_name),
         priority = COALESCE($6, priority),
         due_date = COALESCE($7, due_date),
         estimated_hours = COALESCE($8, estimated_hours),
         status = COALESCE($9, status),
         progress = COALESCE($10, progress),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *, estimated_hours::float8 AS estimated_hours`,
      [id, name, description, assigned_user_id, assigned_user_name, priority,
       due_date || null, estimated_hours !== undefined ? Number(estimated_hours) : null,
       status, progress !== undefined ? Number(progress) : null]
    );

    if (!result.rows.length) return res.status(404).json({ message: 'Task not found.' });

    const task = result.rows[0];
    await logActivity(task.project_id, id, req.user?.userId, req.user?.username, 'task_updated', { status, progress });
    res.json(task);
  } catch (err) { next(err); }
});

tasksRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await query('SELECT project_id, name FROM pm_tasks WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Task not found.' });
    await query('DELETE FROM pm_tasks WHERE id = $1', [id]);
    res.json({ message: 'Task deleted.' });
  } catch (err) { next(err); }
});

// ── Comments ──────────────────────────────────────────────────────────────────

tasksRouter.get('/:id/comments', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM pm_task_comments WHERE task_id = $1 ORDER BY created_at`,
      [Number(req.params.id)]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

tasksRouter.post('/:id/comments', async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const { comment } = req.body;
    if (!comment?.trim()) return res.status(400).json({ message: 'comment is required.' });

    const taskResult = await query('SELECT project_id FROM pm_tasks WHERE id = $1', [taskId]);
    if (!taskResult.rows.length) return res.status(404).json({ message: 'Task not found.' });

    const result = await query(
      `INSERT INTO pm_task_comments (task_id, user_id, user_name, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [taskId, req.user?.userId || 0, req.user?.username || 'Unknown', comment.trim()]
    );

    await logActivity(taskResult.rows[0].project_id, taskId, req.user?.userId, req.user?.username, 'comment_added', null);
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

tasksRouter.delete('/:id/comments/:commentId', async (req, res, next) => {
  try {
    await query(
      `DELETE FROM pm_task_comments WHERE id = $1 AND task_id = $2`,
      [Number(req.params.commentId), Number(req.params.id)]
    );
    res.json({ message: 'Comment deleted.' });
  } catch (err) { next(err); }
});

// ── Attachments ───────────────────────────────────────────────────────────────

tasksRouter.post('/:id/attachments', async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const { file_name, file_size, file_type, file_data } = req.body;
    if (!file_name) return res.status(400).json({ message: 'file_name is required.' });

    const result = await query(
      `INSERT INTO pm_task_attachments (task_id, file_name, file_size, file_type, file_data, uploaded_by, uploaded_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, task_id, file_name, file_size, file_type, uploaded_by, uploaded_by_name, created_at`,
      [taskId, file_name, file_size || null, file_type || null, file_data || null,
       req.user?.userId || null, req.user?.username || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

tasksRouter.delete('/:id/attachments/:attId', async (req, res, next) => {
  try {
    await query(
      `DELETE FROM pm_task_attachments WHERE id = $1 AND task_id = $2`,
      [Number(req.params.attId), Number(req.params.id)]
    );
    res.json({ message: 'Attachment deleted.' });
  } catch (err) { next(err); }
});
