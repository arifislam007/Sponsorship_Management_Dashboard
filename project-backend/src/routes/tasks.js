import { Router } from 'express';
import { query } from '../db.js';
import {
  recalcProjectProgress, notifyUser, notifyManagerOfTaskUpdate, resolveProjectManagerUserId,
  buildTaskAssignedWhatsAppText, buildTaskUpdatedWhatsAppText, buildTaskCommentWhatsAppText,
} from '../lib/taskHelpers.js';

export const tasksRouter = Router();

// ── helpers ───────────────────────────────────────────────────────────────────

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

    if (assigned_user_id && Number(assigned_user_id) !== req.user?.userId) {
      notifyUser(
        Number(assigned_user_id), 'task_assigned',
        'Task Assigned to You',
        `You have been assigned: "${name}" (${priority} priority)`,
        '/dashboard/projects',
        buildTaskAssignedWhatsAppText(assigned_user_name, name, due_date)
      );
    }

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

    // Recalculate project progress whenever status or progress changes
    if (status !== undefined || progress !== undefined) {
      await recalcProjectProgress(task.project_id);
    }

    await logActivity(task.project_id, id, req.user?.userId, req.user?.username, 'task_updated', { status, progress });

    const wasReassigned = assigned_user_id && Number(assigned_user_id) !== req.user?.userId;

    // Notify newly assigned user (if assignee changed)
    if (wasReassigned) {
      notifyUser(
        task.assigned_user_id, 'task_assigned',
        'Task Assigned to You',
        `You have been assigned: "${task.name}"`,
        '/dashboard/projects',
        buildTaskAssignedWhatsAppText(task.assigned_user_name, task.name, task.due_date)
      );
    }

    // Notify the project manager whenever a task under their project changes.
    const changedFields = Object.entries({ name, status, progress, priority, due_date, assigned_user_name })
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k.replace(/_/g, ' ')} → ${v}`);
    notifyManagerOfTaskUpdate(task.project_id, task, changedFields, req.user?.userId, req.user?.username);

    // Notify the currently-assigned person about the change (e.g. status update),
    // unless they made the change themselves or were just freshly assigned above
    // (that case already sent its own "assigned to you" message).
    if (!wasReassigned && changedFields.length && task.assigned_user_id && task.assigned_user_id !== req.user?.userId) {
      notifyUser(
        task.assigned_user_id, 'task_updated',
        `Task Updated: ${task.name}`,
        `${req.user?.username || 'Someone'} updated "${task.name}": ${changedFields.join(', ')}`,
        '/dashboard/projects',
        buildTaskUpdatedWhatsAppText(task.assigned_user_name, task.name, req.user?.username, changedFields)
      );
    }

    res.json(task);
  } catch (err) { next(err); }
});

tasksRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await query('SELECT project_id, name FROM pm_tasks WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Task not found.' });
    const { project_id } = existing.rows[0];
    await query('DELETE FROM pm_tasks WHERE id = $1', [id]);
    await recalcProjectProgress(project_id);
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
    const { comment, progress } = req.body;
    if (!comment?.trim()) return res.status(400).json({ message: 'comment is required.' });

    const taskResult = await query(
      'SELECT project_id, name, status, progress, assigned_user_id, assigned_user_name FROM pm_tasks WHERE id = $1',
      [taskId]
    );
    if (!taskResult.rows.length) return res.status(404).json({ message: 'Task not found.' });

    const task = taskResult.rows[0];
    const projectId = task.project_id;
    const newProgress = (progress !== undefined && progress !== null) ? Math.min(100, Math.max(0, Number(progress))) : null;

    // Insert comment with optional progress snapshot
    const result = await query(
      `INSERT INTO pm_task_comments (task_id, user_id, user_name, comment, progress)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [taskId, req.user?.userId || 0, req.user?.username || 'Unknown', comment.trim(), newProgress]
    );

    // If progress was set, update the task progress + auto-derive status
    if (newProgress !== null) {
      const autoStatus = newProgress === 0 ? 'To Do' : newProgress === 100 ? 'Completed' : 'In Progress';
      await query(
        `UPDATE pm_tasks SET progress = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [taskId, newProgress, autoStatus]
      );

      // Recalculate project progress = completed tasks / total tasks
      await recalcProjectProgress(projectId);
    }

    await logActivity(projectId, taskId, req.user?.userId, req.user?.username, 'comment_added',
      newProgress !== null ? { progress: newProgress } : null);

    // Notify the assignee and the project manager about the new comment,
    // skipping whichever of them wrote it themselves.
    const commentText = comment.trim();
    if (task.assigned_user_id && task.assigned_user_id !== req.user?.userId) {
      notifyUser(
        task.assigned_user_id, 'task_updated',
        `New Comment: ${task.name}`,
        `${req.user?.username || 'Someone'} commented on "${task.name}": ${commentText}`,
        '/dashboard/projects',
        buildTaskCommentWhatsAppText(task.assigned_user_name, task.name, req.user?.username, commentText)
      );
    }
    resolveProjectManagerUserId(projectId).then(pmUserId => {
      if (pmUserId && pmUserId !== req.user?.userId) {
        notifyUser(
          pmUserId, 'task_updated',
          `New Comment: ${task.name}`,
          `${req.user?.username || 'Someone'} commented on "${task.name}": ${commentText}`,
          '/dashboard/projects',
          buildTaskCommentWhatsAppText('Project Manager', task.name, req.user?.username, commentText)
        );
      }
    }).catch(() => {});

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
