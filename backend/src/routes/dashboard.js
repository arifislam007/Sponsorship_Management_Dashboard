import { Router } from 'express';
import { query } from '../db.js';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', async (req, res, next) => {
  try {
    const [studentsResult, donorsResult, revenueResult] = await Promise.all([
      query('SELECT COUNT(*)::int AS total_students, COUNT(*) FILTER (WHERE is_sponsored = true)::int AS sponsored_students FROM students'),
      query('SELECT COUNT(*)::int AS total_donors FROM donors'),
      query(
        `SELECT COALESCE(SUM(amount), 0)::float8 AS monthly_revenue
         FROM accounting_ledger
         WHERE type = 'Credit'
           AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
           AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)`
      ),
    ]);

    res.json({
      total_students: studentsResult.rows[0].total_students,
      sponsored_students: studentsResult.rows[0].sponsored_students,
      total_donors: donorsResult.rows[0].total_donors,
      monthly_revenue: revenueResult.rows[0].monthly_revenue,
    });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get('/donation-trend', async (req, res, next) => {
  try {
    const result = await query(
      `WITH months AS (
         SELECT date_trunc('month', CURRENT_DATE) - (interval '1 month' * generate_series(11, 0, -1)) AS month_start
       ), monthly_totals AS (
         SELECT date_trunc('month', start_date)::date AS month_start, COALESCE(SUM(amount), 0)::float8 AS amount
         FROM sponsorships
         WHERE start_date >= date_trunc('month', CURRENT_DATE) - interval '11 months'
         GROUP BY 1
       )
       SELECT
         to_char(m.month_start, 'Mon') AS month,
         to_char(m.month_start, 'YYYY-MM') AS month_key,
         COALESCE(t.amount, 0)::float8 AS amount
       FROM months m
       LEFT JOIN monthly_totals t ON t.month_start = m.month_start::date
       ORDER BY m.month_start ASC`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get('/analytics', async (req, res, next) => {
  try {
    const [
      overviewResult,
      growthResult,
      topDonorsResult,
      recentSponsorshipsResult,
      monthlyNewResult,
    ] = await Promise.all([
      // Active sponsorships count + total contributions
      query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'Active')::int AS active_sponsorships,
          COALESCE(SUM(amount) FILTER (WHERE status = 'Active'), 0)::float8 AS active_monthly_total,
          COALESCE((SELECT SUM(total_contributed) FROM donors), 0)::float8 AS total_contributions_ever
        FROM sponsorships
      `),

      // Month-over-month new sponsorship count growth
      query(`
        SELECT
          COUNT(*) FILTER (
            WHERE date_trunc('month', start_date) = date_trunc('month', CURRENT_DATE)
          )::int AS new_this_month,
          COUNT(*) FILTER (
            WHERE date_trunc('month', start_date) = date_trunc('month', CURRENT_DATE - interval '1 month')
          )::int AS new_last_month
        FROM sponsorships
      `),

      // Top 5 donors by total contributed
      query(`
        SELECT
          d.name,
          d.total_contributed::float8 AS total_contributed,
          COUNT(s.id) FILTER (WHERE s.status = 'Active')::int AS active_count
        FROM donors d
        LEFT JOIN sponsorships s ON s.donor_id = d.id
        GROUP BY d.id, d.name, d.total_contributed
        ORDER BY d.total_contributed DESC
        LIMIT 5
      `),

      // Recent 6 sponsorships from DB
      query(`
        SELECT
          s.id,
          st.name AS student_name,
          d.name  AS donor_name,
          s.amount::float8 AS amount,
          s.start_date,
          s.status
        FROM sponsorships s
        JOIN students st ON st.id = s.student_id
        JOIN donors   d  ON d.id  = s.donor_id
        ORDER BY s.id DESC
        LIMIT 6
      `),

      // Monthly new sponsorships count for last 12 months (bar chart)
      query(`
        WITH months AS (
          SELECT date_trunc('month', CURRENT_DATE) - (interval '1 month' * generate_series(11, 0, -1)) AS month_start
        ), monthly_counts AS (
          SELECT
            date_trunc('month', start_date) AS month_start,
            COUNT(*)::int AS new_count,
            COALESCE(SUM(amount), 0)::float8 AS new_amount
          FROM sponsorships
          WHERE start_date >= date_trunc('month', CURRENT_DATE) - interval '11 months'
          GROUP BY 1
        )
        SELECT
          to_char(m.month_start, 'Mon') AS month,
          to_char(m.month_start, 'YYYY-MM') AS month_key,
          COALESCE(c.new_count, 0) AS new_count,
          COALESCE(c.new_amount, 0) AS new_amount
        FROM months m
        LEFT JOIN monthly_counts c ON c.month_start = m.month_start
        ORDER BY m.month_start ASC
      `),
    ]);

    const { active_sponsorships, active_monthly_total, total_contributions_ever } = overviewResult.rows[0];
    const { new_this_month, new_last_month } = growthResult.rows[0];

    const growth_pct = new_last_month === 0
      ? (new_this_month > 0 ? 100 : 0)
      : Math.round(((new_this_month - new_last_month) / new_last_month) * 100);

    res.json({
      active_sponsorships,
      active_monthly_total,
      total_contributions_ever,
      new_this_month,
      new_last_month,
      growth_pct,
      top_donors: topDonorsResult.rows,
      recent_sponsorships: recentSponsorshipsResult.rows,
      monthly_new: monthlyNewResult.rows,
    });
  } catch (error) {
    next(error);
  }
});
