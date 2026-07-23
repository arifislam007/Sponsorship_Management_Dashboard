import { Router } from 'express';
import { query } from '../db.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [
      studentStats,
      classCount,
      todayAttendance,
      recentMonitoring,
      pendingMonitoring,
      monthlyAttendance,
      monthlyEvaluation,
      thisMonthByClass,
      topEvalClasses,
      evalOverall,
    ] = await Promise.all([
      query(`SELECT
        COUNT(*)::int AS total_students,
        COUNT(*) FILTER (WHERE is_active)::int AS active_students
        FROM sc_students`),

      query(`SELECT COUNT(*)::int AS total_classes FROM sc_classes WHERE is_active`),

      query(`SELECT
        COUNT(*)::int AS total_records,
        COUNT(*) FILTER (WHERE status = 'Present')::int AS present,
        COUNT(*) FILTER (WHERE status = 'Absent')::int AS absent,
        COUNT(*) FILTER (WHERE status = 'Late')::int AS late
        FROM sc_attendance WHERE attendance_date = $1`, [today]),

      query(`SELECT f.id, f.form_code, f.monitoring_date, f.class_name, f.observer_name,
              f.overall_rating, f.score_percent, f.status, f.class_teacher
             FROM sc_monitoring_forms f
             ORDER BY f.created_at DESC LIMIT 5`),

      query(`SELECT COUNT(*)::int AS pending FROM sc_monitoring_forms WHERE status = 'Draft'`),

      // Monthly attendance trend — last 6 months from class_attendance_summary
      query(`
        SELECT TO_CHAR(attendance_date, 'YYYY-MM') AS month,
               TO_CHAR(attendance_date, 'Mon YY') AS month_label,
               ROUND(AVG(CASE WHEN total_students > 0
                 THEN attended::DECIMAL / total_students * 100 END), 1) AS avg_pct,
               SUM(attended)::int AS total_attended,
               SUM(total_students)::int AS total_students
        FROM sc_class_attendance_summary
        WHERE attendance_date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY TO_CHAR(attendance_date, 'YYYY-MM'), TO_CHAR(attendance_date, 'Mon YY')
        ORDER BY month
      `),

      // Monthly evaluation score trend — last 6 months
      query(`
        SELECT TO_CHAR(monitoring_date, 'YYYY-MM') AS month,
               TO_CHAR(monitoring_date, 'Mon YY') AS month_label,
               ROUND(AVG(score_percent), 1) AS avg_score,
               COUNT(*)::int AS count
        FROM sc_monitoring_forms
        WHERE status = 'Submitted'
          AND monitoring_date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY TO_CHAR(monitoring_date, 'YYYY-MM'), TO_CHAR(monitoring_date, 'Mon YY')
        ORDER BY month
      `),

      // This month class-wise attendance
      query(`
        SELECT c.name AS class_name,
               ROUND(AVG(CASE WHEN s.total_students > 0
                 THEN s.attended::DECIMAL / s.total_students * 100 END), 1) AS avg_pct,
               SUM(s.attended)::int AS total_attended,
               SUM(s.total_students)::int AS total_students,
               COUNT(*)::int AS days_recorded
        FROM sc_class_attendance_summary s
        JOIN sc_classes c ON c.id = s.class_id
        WHERE s.attendance_date >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY c.name ORDER BY c.name
      `),

      // Top evaluation classes (all time, submitted)
      query(`
        SELECT class_name,
               ROUND(AVG(score_percent), 1) AS avg_score,
               COUNT(*)::int AS total_evals
        FROM sc_monitoring_forms
        WHERE status = 'Submitted' AND class_name IS NOT NULL
        GROUP BY class_name ORDER BY avg_score DESC NULLS LAST LIMIT 9
      `),

      // Overall evaluation stats
      query(`
        SELECT COUNT(*)::int AS total_evals,
               COUNT(*) FILTER (WHERE status = 'Submitted')::int AS submitted_evals,
               ROUND(AVG(score_percent) FILTER (WHERE status = 'Submitted'), 1) AS avg_eval_score
        FROM sc_monitoring_forms
      `),
    ]);

    const ss = studentStats.rows[0];
    const ta = todayAttendance.rows[0];
    const attendancePct = ta.total_records > 0
      ? Math.round((ta.present / ta.total_records) * 100)
      : 0;

    res.json({
      total_students: ss.total_students,
      active_students: ss.active_students,
      total_classes: classCount.rows[0].total_classes,
      today_attendance: { ...ta, percentage: attendancePct },
      recent_monitoring: recentMonitoring.rows,
      pending_monitoring: pendingMonitoring.rows[0].pending,
      monthly_attendance: monthlyAttendance.rows,
      monthly_evaluation: monthlyEvaluation.rows,
      this_month_by_class: thisMonthByClass.rows,
      top_eval_classes: topEvalClasses.rows,
      eval_overall: evalOverall.rows[0],
    });
  } catch (err) { next(err); }
});
