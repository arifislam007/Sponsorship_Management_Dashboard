import { Router } from 'express';
import { query } from '../db.js';

export const ledgerRouter = Router();

ledgerRouter.get('/entries', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
         id,
         date,
         voucher_ref,
         particulars,
         category,
         type,
         amount::float8 AS amount,
         closing_balance::float8 AS closing_balance
       FROM accounting_ledger
       ORDER BY date DESC, id DESC`
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

ledgerRouter.get('/summary', async (req, res, next) => {
  try {
    const [totalsResult, latestResult, firstResult] = await Promise.all([
      query(
        `SELECT
           COALESCE(SUM(CASE WHEN type = 'Credit' THEN amount ELSE 0 END), 0)::float8 AS total_credit,
           COALESCE(SUM(CASE WHEN type = 'Debit' THEN amount ELSE 0 END), 0)::float8 AS total_debit
         FROM accounting_ledger`
      ),
      query(
        `SELECT closing_balance::float8 AS closing_balance
         FROM accounting_ledger
         ORDER BY date DESC, id DESC
         LIMIT 1`
      ),
      query(
        `SELECT
           type,
           amount::float8 AS amount,
           closing_balance::float8 AS closing_balance
         FROM accounting_ledger
         ORDER BY date ASC, id ASC
         LIMIT 1`
      ),
    ]);

    const totalCredit = totalsResult.rows[0].total_credit || 0;
    const totalDebit = totalsResult.rows[0].total_debit || 0;
    const closingBalance = latestResult.rows[0]?.closing_balance || 0;

    let openingBalance = 0;
    if (firstResult.rows.length) {
      const first = firstResult.rows[0];
      openingBalance =
        first.type === 'Credit'
          ? first.closing_balance - first.amount
          : first.closing_balance + first.amount;
    }

    res.json({
      opening_balance: openingBalance,
      total_credit: totalCredit,
      total_debit: totalDebit,
      closing_balance: closingBalance,
    });
  } catch (error) {
    next(error);
  }
});

ledgerRouter.post('/entries', async (req, res, next) => {
  try {
    const { date, voucher_ref, particulars, category, type, amount } = req.body;
    const parsedAmount = Number(amount);

    if (!date || !voucher_ref || !particulars || !category || !type || Number.isNaN(parsedAmount)) {
      return res.status(400).json({ message: 'Missing required ledger entry fields.' });
    }

    if (parsedAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero.' });
    }

    if (type !== 'Credit' && type !== 'Debit') {
      return res.status(400).json({ message: 'Type must be Credit or Debit.' });
    }

    const latestBalanceResult = await query(
      `SELECT closing_balance::float8 AS closing_balance
       FROM accounting_ledger
       ORDER BY date DESC, id DESC
       LIMIT 1`
    );

    const latestBalance = latestBalanceResult.rows[0]?.closing_balance || 0;
    const closingBalance = type === 'Credit' ? latestBalance + parsedAmount : latestBalance - parsedAmount;

    const insertResult = await query(
      `INSERT INTO accounting_ledger (date, voucher_ref, particulars, category, type, amount, closing_balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING
         id,
         date,
         voucher_ref,
         particulars,
         category,
         type,
         amount::float8 AS amount,
         closing_balance::float8 AS closing_balance`,
      [date, voucher_ref, particulars, category, type, parsedAmount, closingBalance]
    );

    return res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    next(error);
  }
});
