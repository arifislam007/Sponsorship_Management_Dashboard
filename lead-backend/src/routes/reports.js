import { Router } from 'express';
import { query } from '../db.js';

export const reportsRouter = Router();

reportsRouter.get('/', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const ranged = Boolean(from && to);

    // When a range is given, filter each report to it; otherwise keep the default
    // "last 12 months" trend view. LIMIT is dropped once a range narrows the data.
    const admittedDateExpr = 'COALESCE(admission_date, updated_at::date)';
    const admittedRangeClause = ranged ? `AND ${admittedDateExpr} BETWEEN $1 AND $2` : '';
    const admittedParams = ranged ? [from, to] : [];

    const followupRangeClause = ranged ? 'AND followup_date BETWEEN $1 AND $2' : '';
    const followupParams = ranged ? [from, to] : [];

    const lostRangeClause = ranged ? 'AND updated_at::date BETWEEN $1 AND $2' : '';
    const lostParams = ranged ? [from, to] : [];

    const newLeadsRangeClause = ranged ? 'AND created_at::date BETWEEN $1 AND $2' : '';
    const newLeadsParams = ranged ? [from, to] : [];

    const courseRangeClause = ranged ? 'AND l.created_at::date BETWEEN $1 AND $2' : '';
    const courseParams = ranged ? [from, to] : [];

    const staffRangeClause = ranged ? 'AND created_at::date BETWEEN $1 AND $2' : '';
    const staffParams = ranged ? [from, to] : [];

    const [
      admittedByMonth, followupCallsByMonth, lostBySource,
      newLeadsByMonth, courseConversion, staffPerformance,
    ] = await Promise.all([
      query(`SELECT TO_CHAR(${admittedDateExpr}, 'YYYY-MM') AS month,
                    TO_CHAR(${admittedDateExpr}, 'Mon YYYY') AS month_label,
                    COUNT(*)::int AS count
             FROM lead_leads
             WHERE status = 'Admitted' ${admittedRangeClause}
             GROUP BY 1, 2
             ORDER BY 1 DESC
             ${ranged ? '' : 'LIMIT 12'}`, admittedParams),

      query(`SELECT TO_CHAR(followup_date, 'YYYY-MM') AS month,
                    TO_CHAR(followup_date, 'Mon YYYY') AS month_label,
                    COUNT(*)::int AS total_calls,
                    COUNT(*) FILTER (WHERE method = 'Call')::int AS phone_calls
             FROM lead_followups
             WHERE 1=1 ${followupRangeClause}
             GROUP BY 1, 2
             ORDER BY 1 DESC
             ${ranged ? '' : 'LIMIT 12'}`, followupParams),

      query(`SELECT source, COUNT(*)::int AS count
             FROM lead_leads
             WHERE status = 'Lost' ${lostRangeClause}
             GROUP BY source
             ORDER BY count DESC`, lostParams),

      query(`SELECT TO_CHAR(created_at, 'YYYY-MM') AS month,
                    TO_CHAR(created_at, 'Mon YYYY') AS month_label,
                    COUNT(*)::int AS count
             FROM lead_leads
             WHERE 1=1 ${newLeadsRangeClause}
             GROUP BY 1, 2
             ORDER BY 1 DESC
             ${ranged ? '' : 'LIMIT 12'}`, newLeadsParams),

      query(`SELECT c.name AS course_name,
                    COUNT(l.id)::int AS total_leads,
                    COUNT(*) FILTER (WHERE l.status = 'Admitted')::int AS admitted,
                    ROUND(COUNT(*) FILTER (WHERE l.status = 'Admitted')::numeric / NULLIF(COUNT(l.id), 0) * 100, 1) AS conversion_pct
             FROM lead_courses c
             LEFT JOIN lead_leads l ON l.course_id = c.id ${courseRangeClause}
             GROUP BY c.id, c.name
             ORDER BY total_leads DESC`, courseParams),

      query(`SELECT COALESCE(NULLIF(assigned_to, ''), 'Unassigned') AS assigned_to,
                    COUNT(*)::int AS total_leads,
                    COUNT(*) FILTER (WHERE status = 'Admitted')::int AS admitted
             FROM lead_leads
             WHERE 1=1 ${staffRangeClause}
             GROUP BY 1
             ORDER BY total_leads DESC`, staffParams),
    ]);

    res.json({
      admitted_by_month: admittedByMonth.rows.reverse(),
      followup_calls_by_month: followupCallsByMonth.rows.reverse(),
      lost_by_source: lostBySource.rows,
      new_leads_by_month: newLeadsByMonth.rows.reverse(),
      course_conversion: courseConversion.rows,
      staff_performance: staffPerformance.rows,
    });
  } catch (err) { next(err); }
});
