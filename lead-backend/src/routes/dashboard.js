import { Router } from 'express';
import { query } from '../db.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', async (req, res, next) => {
  try {
    const [
      leadStats, statusStats, courseStats, sourceStats, overdue, recentLeads,
      leadsByMonth, statusBySource, admittedByAttempts,
    ] = await Promise.all([
      query(`SELECT
               COUNT(*)::int AS total_leads,
               COUNT(*) FILTER (WHERE status = 'Admitted')::int AS admitted_leads,
               COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE))::int AS new_this_month
             FROM lead_leads`),

      query(`SELECT status, COUNT(*)::int AS count FROM lead_leads GROUP BY status`),

      query(`SELECT c.name AS course_name, COUNT(l.id)::int AS lead_count
             FROM lead_courses c
             LEFT JOIN lead_leads l ON l.course_id = c.id
             GROUP BY c.id, c.name
             ORDER BY lead_count DESC`),

      query(`SELECT source, COUNT(*)::int AS count FROM lead_leads GROUP BY source ORDER BY count DESC`),

      query(`SELECT COUNT(*)::int AS overdue_followups
             FROM lead_followups f
             JOIN lead_leads l ON l.id = f.lead_id
             WHERE f.next_followup_date < CURRENT_DATE AND l.status NOT IN ('Admitted', 'Lost')`),

      query(`SELECT l.id, l.full_name, l.phone, l.status, l.created_at, c.name AS course_name
             FROM lead_leads l
             LEFT JOIN lead_courses c ON c.id = l.course_id
             ORDER BY l.created_at DESC
             LIMIT 5`),

      query(`SELECT TO_CHAR(created_at, 'YYYY-MM') AS month,
                    TO_CHAR(created_at, 'Mon YYYY') AS month_label,
                    COUNT(*)::int AS count
             FROM lead_leads
             GROUP BY 1, 2
             ORDER BY 1 DESC
             LIMIT 6`),

      query(`SELECT source,
                    COUNT(*) FILTER (WHERE status = 'New')::int AS "new",
                    COUNT(*) FILTER (WHERE status = 'Contacted')::int AS contacted,
                    COUNT(*) FILTER (WHERE status = 'Interested')::int AS interested,
                    COUNT(*) FILTER (WHERE status = 'Follow-up')::int AS followup,
                    COUNT(*) FILTER (WHERE status = 'Admitted')::int AS admitted,
                    COUNT(*) FILTER (WHERE status = 'Lost')::int AS lost
             FROM lead_leads
             GROUP BY source
             ORDER BY source`),

      query(`SELECT attempts, COUNT(*)::int AS lead_count
             FROM (
               SELECT l.id, COALESCE(MAX(f.attempt_number), 0) AS attempts
               FROM lead_leads l
               LEFT JOIN lead_followups f ON f.lead_id = l.id
               WHERE l.status = 'Admitted'
               GROUP BY l.id
             ) x
             GROUP BY attempts
             ORDER BY attempts`),
    ]);

    const total = leadStats.rows[0].total_leads || 0;
    const admitted = leadStats.rows[0].admitted_leads || 0;
    const conversion_rate = total > 0 ? Math.round((admitted / total) * 1000) / 10 : 0;

    res.json({
      lead_stats: { ...leadStats.rows[0], conversion_rate },
      status_breakdown: statusStats.rows,
      course_breakdown: courseStats.rows,
      source_breakdown: sourceStats.rows,
      overdue_followups: overdue.rows[0].overdue_followups,
      recent_leads: recentLeads.rows,
      leads_by_month: leadsByMonth.rows.reverse(),
      status_by_source: statusBySource.rows,
      admitted_by_attempts: admittedByAttempts.rows,
    });
  } catch (err) { next(err); }
});
