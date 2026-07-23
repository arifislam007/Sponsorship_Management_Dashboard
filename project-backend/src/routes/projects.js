import { Router } from 'express';
import { query } from '../db.js';

export const projectsRouter = Router();

// ── helpers ──────────────────────────────────────────────────────────────────

async function logActivity(projectId, taskId, userId, userName, action, details) {
  await query(
    `INSERT INTO pm_activity_logs (project_id, task_id, user_id, user_name, action, details)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [projectId, taskId, userId, userName, action, details ? JSON.stringify(details) : null]
  );
}

// ── Projects ─────────────────────────────────────────────────────────────────

projectsRouter.get('/', async (req, res, next) => {
  try {
    const { status, category, search, limit = 50, offset = 0 } = req.query;
    const params = [];
    const clauses = [];

    if (status) { params.push(status); clauses.push(`p.status = $${params.length}`); }
    if (category) { params.push(category); clauses.push(`p.category = $${params.length}`); }
    if (search) { params.push(`%${search}%`); clauses.push(`(p.name ILIKE $${params.length} OR p.code ILIKE $${params.length})`); }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM pm_projects p ${where}`,
      params
    );

    params.push(Math.min(Number(limit), 200), Math.max(Number(offset), 0));

    const result = await query(
      `SELECT p.*,
              p.budget::float8 AS budget,
              COUNT(DISTINCT t.id)::int AS task_count,
              COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'Completed')::int AS completed_tasks,
              COUNT(DISTINCT m.id)::int AS member_count
       FROM pm_projects p
       LEFT JOIN pm_tasks t ON t.project_id = p.id
       LEFT JOIN pm_project_members m ON m.project_id = p.id
       ${where}
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: result.rows, total: countResult.rows[0].total });
  } catch (err) { next(err); }
});

projectsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const pResult = await query(
      `SELECT p.*, p.budget::float8 AS budget,
              COUNT(DISTINCT t.id)::int AS task_count,
              COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'Completed')::int AS completed_tasks
       FROM pm_projects p
       LEFT JOIN pm_tasks t ON t.project_id = p.id
       WHERE p.id = $1
       GROUP BY p.id`,
      [id]
    );
    if (!pResult.rows.length) return res.status(404).json({ message: 'Project not found.' });

    const members = await query(
      `SELECT * FROM pm_project_members WHERE project_id = $1 ORDER BY joined_at`,
      [id]
    );

    const docs = await query(
      `SELECT id, project_id, file_name, file_size, file_type, uploaded_by, uploaded_by_name, created_at
       FROM pm_project_documents WHERE project_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    res.json({ ...pResult.rows[0], members: members.rows, documents: docs.rows });
  } catch (err) { next(err); }
});

projectsRouter.post('/', async (req, res, next) => {
  try {
    const {
      code, name, category = 'Administration', description, project_manager_id,
      project_manager_name, start_date, end_date, budget = 0, status = 'Planning'
    } = req.body;

    if (!code || !name) return res.status(400).json({ message: 'code and name are required.' });

    const result = await query(
      `INSERT INTO pm_projects
         (code, name, category, description, project_manager_id, project_manager_name,
          start_date, end_date, budget, status, created_by, created_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *, budget::float8 AS budget`,
      [code, name, category, description || null, project_manager_id || null,
       project_manager_name || null, start_date || null, end_date || null,
       Number(budget), status, req.user?.userId || null, req.user?.username || null]
    );

    await logActivity(result.rows[0].id, null, req.user?.userId, req.user?.username, 'project_created', { name });
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

projectsRouter.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const {
      name, category, description, project_manager_id, project_manager_name,
      start_date, end_date, budget, status, progress
    } = req.body;

    const result = await query(
      `UPDATE pm_projects SET
         name = COALESCE($2, name),
         category = COALESCE($3, category),
         description = COALESCE($4, description),
         project_manager_id = COALESCE($5, project_manager_id),
         project_manager_name = COALESCE($6, project_manager_name),
         start_date = COALESCE($7, start_date),
         end_date = COALESCE($8, end_date),
         budget = COALESCE($9, budget),
         status = COALESCE($10, status),
         progress = COALESCE($11, progress),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *, budget::float8 AS budget`,
      [id, name, category, description, project_manager_id, project_manager_name,
       start_date || null, end_date || null, budget !== undefined ? Number(budget) : null,
       status, progress !== undefined ? Number(progress) : null]
    );

    if (!result.rows.length) return res.status(404).json({ message: 'Project not found.' });
    await logActivity(id, null, req.user?.userId, req.user?.username, 'project_updated', { status, progress });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

projectsRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await query('SELECT name FROM pm_projects WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Project not found.' });
    await query('DELETE FROM pm_projects WHERE id = $1', [id]);
    res.json({ message: 'Project deleted.' });
  } catch (err) { next(err); }
});

// ── Project Members ───────────────────────────────────────────────────────────

projectsRouter.get('/:id/members', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM pm_project_members WHERE project_id = $1 ORDER BY joined_at`,
      [Number(req.params.id)]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

projectsRouter.post('/:id/members', async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const { user_id, user_name, role = 'Member' } = req.body;
    if (!user_id || !user_name) return res.status(400).json({ message: 'user_id and user_name are required.' });

    const result = await query(
      `INSERT INTO pm_project_members (project_id, user_id, user_name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING *`,
      [projectId, user_id, user_name, role]
    );
    await logActivity(projectId, null, req.user?.userId, req.user?.username, 'member_added', { user_name, role });
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

projectsRouter.delete('/:id/members/:userId', async (req, res, next) => {
  try {
    await query(
      `DELETE FROM pm_project_members WHERE project_id = $1 AND user_id = $2`,
      [Number(req.params.id), Number(req.params.userId)]
    );
    res.json({ message: 'Member removed.' });
  } catch (err) { next(err); }
});

// ── Project Documents ─────────────────────────────────────────────────────────

projectsRouter.get('/:id/documents', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, project_id, file_name, file_size, file_type, uploaded_by, uploaded_by_name, created_at
       FROM pm_project_documents WHERE project_id = $1 ORDER BY created_at DESC`,
      [Number(req.params.id)]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

projectsRouter.post('/:id/documents', async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const { file_name, file_size, file_type, file_data } = req.body;
    if (!file_name) return res.status(400).json({ message: 'file_name is required.' });

    const result = await query(
      `INSERT INTO pm_project_documents (project_id, file_name, file_size, file_type, file_data, uploaded_by, uploaded_by_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, project_id, file_name, file_size, file_type, uploaded_by, uploaded_by_name, created_at`,
      [projectId, file_name, file_size || null, file_type || null, file_data || null,
       req.user?.userId || null, req.user?.username || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

projectsRouter.delete('/:id/documents/:docId', async (req, res, next) => {
  try {
    await query(
      `DELETE FROM pm_project_documents WHERE id = $1 AND project_id = $2`,
      [Number(req.params.docId), Number(req.params.id)]
    );
    res.json({ message: 'Document deleted.' });
  } catch (err) { next(err); }
});

// ── Activity Log ──────────────────────────────────────────────────────────────

projectsRouter.get('/:id/activity', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, project_id, task_id, user_id, user_name, action, details, created_at
       FROM pm_activity_logs
       WHERE project_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [Number(req.params.id)]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});
