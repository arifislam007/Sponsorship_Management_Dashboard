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
