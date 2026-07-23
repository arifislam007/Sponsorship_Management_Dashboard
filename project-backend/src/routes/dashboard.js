import { Router } from 'express';
import { query } from '../db.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', async (req, res, next) => {
  try {
    const [
      projectStats,
      taskStats,
      overdueResult,
      recentActivity,
      progressByStatus,
      tasksByPriority,
      upcomingTasks,
    ] = await Promise.all([
      query(`SELECT
               COUNT(*)::int AS total_projects,
               COUNT(*) FILTER (WHERE status = 'Active')::int AS active_projects,
               COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed_projects,
               COUNT(*) FILTER (WHERE status = 'On Hold')::int AS on_hold_projects,
               COUNT(*) FILTER (WHERE status = 'Planning')::int AS planning_projects,
               ROUND(AVG(progress))::int AS avg_progress
             FROM pm_projects`),

      query(`SELECT
               COUNT(*)::int AS total_tasks,
               COUNT(*) FILTER (WHERE status = 'To Do')::int AS todo_tasks,
               COUNT(*) FILTER (WHERE status = 'In Progress')::int AS in_progress_tasks,
               COUNT(*) FILTER (WHERE status = 'Review')::int AS review_tasks,
               COUNT(*) FILTER (WHERE status = 'Completed')::int AS completed_tasks
             FROM pm_tasks`),

      query(`SELECT COUNT(*)::int AS overdue_tasks
             FROM pm_tasks
             WHERE due_date < CURRENT_DATE AND status != 'Completed'`),

      query(`SELECT l.*, p.name AS project_name
             FROM pm_activity_logs l
             LEFT JOIN pm_projects p ON p.id = l.project_id
             ORDER BY l.created_at DESC
             LIMIT 10`),

      query(`SELECT status, COUNT(*)::int AS count, ROUND(AVG(progress))::int AS avg_progress
             FROM pm_projects
             GROUP BY status
             ORDER BY count DESC`),

      query(`SELECT priority, COUNT(*)::int AS count
             FROM pm_tasks
             WHERE status != 'Completed'
             GROUP BY priority
             ORDER BY
               CASE priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END`),

      query(`SELECT t.id, t.name, t.priority, t.due_date, t.status, t.progress,
                    p.name AS project_name, p.code AS project_code,
                    t.assigned_user_name
             FROM pm_tasks t
             JOIN pm_projects p ON p.id = t.project_id
             WHERE t.due_date >= CURRENT_DATE
               AND t.status != 'Completed'
             ORDER BY t.due_date ASC
             LIMIT 5`),
    ]);

    res.json({
      project_stats: { ...projectStats.rows[0], overdue_tasks: overdueResult.rows[0].overdue_tasks },
      task_stats: { ...taskStats.rows[0], overdue: overdueResult.rows[0].overdue_tasks },
      recent_activity: recentActivity.rows,
      progress_by_status: progressByStatus.rows,
      tasks_by_priority: tasksByPriority.rows,
      upcoming_tasks: upcomingTasks.rows,
    });
  } catch (err) { next(err); }
});

// Recent projects for quick overview
dashboardRouter.get('/projects', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.id, p.code, p.name, p.status, p.progress, p.category,
              p.end_date, p.project_manager_name,
              COUNT(DISTINCT t.id)::int AS task_count,
              COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'Completed')::int AS completed_tasks
       FROM pm_projects p
       LEFT JOIN pm_tasks t ON t.project_id = p.id
       WHERE p.status != 'Archived'
       GROUP BY p.id
       ORDER BY
         CASE p.status WHEN 'Active' THEN 1 WHEN 'Planning' THEN 2 ELSE 3 END,
         p.updated_at DESC
       LIMIT 6`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});
