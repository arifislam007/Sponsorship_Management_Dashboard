import { Router } from 'express';
import { query } from '../db.js';

export const accountingRouter = Router();

// ── helpers ────────────────────────────────────────────────────────────────

async function nextVoucherNo(type) {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `${type}-${ym}-`;
  const result = await query(
    `SELECT voucher_no FROM acc_vouchers WHERE voucher_no LIKE $1 ORDER BY voucher_no DESC LIMIT 1`,
    [`${prefix}%`]
  );
  const last = result.rows[0]?.voucher_no;
  const seq = last ? parseInt(last.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(5, '0')}`;
}

async function recalcAccountBalance(accountId) {
  await query(
    `UPDATE acc_ledger l
     SET running_balance = sub.rb
     FROM (
       SELECT id,
         SUM(credit - debit) OVER (
           PARTITION BY account_id
           ORDER BY date ASC, id ASC
           ROWS UNBOUNDED PRECEDING
         ) AS rb
       FROM acc_ledger
       WHERE account_id = $1
     ) sub
     WHERE l.id = sub.id AND l.account_id = $1`,
    [accountId]
  );
}

// ── Chart of Accounts ───────────────────────────────────────────────────────

accountingRouter.get('/accounts', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT a.id, a.code, a.name, a.account_type, a.parent_id, a.is_active,
              p.name AS parent_name,
              COALESCE(SUM(l.credit) - SUM(l.debit), 0)::float8 AS balance
       FROM acc_accounts a
       LEFT JOIN acc_accounts p ON p.id = a.parent_id
       LEFT JOIN acc_ledger l ON l.account_id = a.id
       GROUP BY a.id, a.code, a.name, a.account_type, a.parent_id, a.is_active, p.name
       ORDER BY a.code`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

accountingRouter.post('/accounts', async (req, res, next) => {
  try {
    const { code, name, account_type, parent_id } = req.body;
    if (!code || !name || !account_type) {
      return res.status(400).json({ message: 'code, name, and account_type are required.' });
    }
    const result = await query(
      `INSERT INTO acc_accounts (code, name, account_type, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, code, name, account_type, parent_id, is_active`,
      [code, name, account_type, parent_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

accountingRouter.put('/accounts/:id', async (req, res, next) => {
  try {
    const { name, is_active } = req.body;
    const result = await query(
      `UPDATE acc_accounts SET name = COALESCE($1, name), is_active = COALESCE($2, is_active)
       WHERE id = $3
       RETURNING id, code, name, account_type, parent_id, is_active`,
      [name || null, is_active ?? null, Number(req.params.id)]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Account not found.' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── Projects ────────────────────────────────────────────────────────────────

accountingRouter.get('/projects', async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM acc_projects ORDER BY name`);
    res.json(result.rows);
  } catch (err) { next(err); }
});

accountingRouter.post('/projects', async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) return res.status(400).json({ message: 'name and code are required.' });
    const result = await query(
      `INSERT INTO acc_projects (name, code, description) VALUES ($1, $2, $3)
       RETURNING *`,
      [name, code, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// ── Vouchers ────────────────────────────────────────────────────────────────

accountingRouter.get('/vouchers', async (req, res, next) => {
  try {
    const { type, status, from, to, limit = 50, offset = 0 } = req.query;
    const params = [];
    const clauses = [];

    if (type) { params.push(type); clauses.push(`v.voucher_type = $${params.length}`); }
    if (status) { params.push(status); clauses.push(`v.status = $${params.length}`); }
    if (from) { params.push(from); clauses.push(`v.date >= $${params.length}`); }
    if (to) { params.push(to); clauses.push(`v.date <= $${params.length}`); }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM acc_vouchers v ${where}`,
      params
    );

    params.push(Math.min(Number(limit), 200), Math.max(Number(offset), 0));
    const result = await query(
      `SELECT v.id, v.voucher_no, v.voucher_type, v.date, v.narration,
              v.status, v.total_amount::float8, v.created_at,
              p.name AS project_name,
              u.full_name AS created_by_name
       FROM acc_vouchers v
       LEFT JOIN acc_projects p ON p.id = v.project_id
       LEFT JOIN users u ON u.id = v.created_by
       ${where}
       ORDER BY v.date DESC, v.id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: result.rows, total: countResult.rows[0].total });
  } catch (err) { next(err); }
});

accountingRouter.get('/vouchers/:id', async (req, res, next) => {
  try {
    const vResult = await query(
      `SELECT v.*, v.total_amount::float8,
              p.name AS project_name,
              uc.full_name AS created_by_name,
              ua.full_name AS approved_by_name
       FROM acc_vouchers v
       LEFT JOIN acc_projects p ON p.id = v.project_id
       LEFT JOIN users uc ON uc.id = v.created_by
       LEFT JOIN users ua ON ua.id = v.approved_by
       WHERE v.id = $1`,
      [Number(req.params.id)]
    );
    if (!vResult.rows.length) return res.status(404).json({ message: 'Voucher not found.' });

    const lResult = await query(
      `SELECT vl.*, vl.debit::float8, vl.credit::float8,
              a.code AS account_code, a.name AS account_name, a.account_type
       FROM acc_voucher_lines vl
       JOIN acc_accounts a ON a.id = vl.account_id
       WHERE vl.voucher_id = $1
       ORDER BY vl.line_order, vl.id`,
      [Number(req.params.id)]
    );

    res.json({ ...vResult.rows[0], lines: lResult.rows });
  } catch (err) { next(err); }
});

accountingRouter.post('/vouchers', async (req, res, next) => {
  try {
    const { voucher_type, date, narration, project_id, lines } = req.body;

    if (!voucher_type || !date || !narration || !lines?.length) {
      return res.status(400).json({ message: 'voucher_type, date, narration, and lines are required.' });
    }

    const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.005) {
      return res.status(400).json({ message: `Debits (${totalDebit}) must equal credits (${totalCredit}).` });
    }

    const voucher_no = await nextVoucherNo(voucher_type);

    const vResult = await query(
      `INSERT INTO acc_vouchers (voucher_no, voucher_type, date, narration, project_id, total_amount, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, voucher_no, voucher_type, date, narration, status, total_amount::float8`,
      [voucher_no, voucher_type, date, narration, project_id || null, totalDebit, req.user?.id || null]
    );
    const voucher = vResult.rows[0];

    for (let i = 0; i < lines.length; i++) {
      const { account_id, debit, credit, narration: ln } = lines[i];
      await query(
        `INSERT INTO acc_voucher_lines (voucher_id, account_id, debit, credit, narration, line_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [voucher.id, account_id, Number(debit || 0), Number(credit || 0), ln || null, i]
      );
    }

    res.status(201).json(voucher);
  } catch (err) { next(err); }
});

accountingRouter.put('/vouchers/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { date, narration, project_id, lines } = req.body;

    const existing = await query(`SELECT status FROM acc_vouchers WHERE id = $1`, [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Voucher not found.' });
    if (!['Draft'].includes(existing.rows[0].status)) {
      return res.status(400).json({ message: 'Only Draft vouchers can be edited.' });
    }

    const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.005) {
      return res.status(400).json({ message: `Debits (${totalDebit}) must equal credits (${totalCredit}).` });
    }

    await query(
      `UPDATE acc_vouchers SET date=$1, narration=$2, project_id=$3, total_amount=$4 WHERE id=$5`,
      [date, narration, project_id || null, totalDebit, id]
    );

    await query(`DELETE FROM acc_voucher_lines WHERE voucher_id = $1`, [id]);
    for (let i = 0; i < lines.length; i++) {
      const { account_id, debit, credit, narration: ln } = lines[i];
      await query(
        `INSERT INTO acc_voucher_lines (voucher_id, account_id, debit, credit, narration, line_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, account_id, Number(debit || 0), Number(credit || 0), ln || null, i]
      );
    }

    res.json({ message: 'Voucher updated.' });
  } catch (err) { next(err); }
});

// ── Voucher Workflow ────────────────────────────────────────────────────────

async function transitionVoucher(req, res, next, fromStatus, toStatus, extraFields) {
  try {
    const id = Number(req.params.id);
    const existing = await query(`SELECT status FROM acc_vouchers WHERE id = $1`, [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Voucher not found.' });
    if (existing.rows[0].status !== fromStatus) {
      return res.status(400).json({ message: `Voucher must be in '${fromStatus}' status.` });
    }
    const keys = Object.keys(extraFields);
    const values = Object.values(extraFields);
    const sets = keys.map((k, i) => `${k} = $${i + 2}`);
    await query(
      `UPDATE acc_vouchers SET status = $1, ${sets.join(', ')} WHERE id = $${values.length + 2}`,
      [toStatus, ...values, id]
    );
    res.json({ message: `Voucher ${toStatus.toLowerCase()}.` });
  } catch (err) { next(err); }
}

accountingRouter.post('/vouchers/:id/submit', (req, res, next) =>
  transitionVoucher(req, res, next, 'Draft', 'Submitted', {
    submitted_by: req.user?.id || null,
    submitted_at: new Date(),
  })
);

accountingRouter.post('/vouchers/:id/approve', (req, res, next) =>
  transitionVoucher(req, res, next, 'Submitted', 'Approved', {
    approved_by: req.user?.id || null,
    approved_at: new Date(),
  })
);

accountingRouter.post('/vouchers/:id/post', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const vResult = await query(
      `SELECT v.*, v.total_amount::float8 FROM acc_vouchers v WHERE v.id = $1`,
      [id]
    );
    if (!vResult.rows.length) return res.status(404).json({ message: 'Voucher not found.' });
    const voucher = vResult.rows[0];
    if (voucher.status !== 'Approved') {
      return res.status(400).json({ message: "Voucher must be 'Approved' before posting." });
    }

    const lines = await query(
      `SELECT * FROM acc_voucher_lines WHERE voucher_id = $1 ORDER BY line_order, id`,
      [id]
    );

    for (const line of lines.rows) {
      await query(
        `INSERT INTO acc_ledger (account_id, voucher_id, voucher_line_id, date, debit, credit)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [line.account_id, id, line.id, voucher.date, Number(line.debit), Number(line.credit)]
      );
      await recalcAccountBalance(line.account_id);
    }

    await query(
      `UPDATE acc_vouchers SET status = 'Posted', posted_by = $1, posted_at = $2 WHERE id = $3`,
      [req.user?.id || null, new Date(), id]
    );

    res.json({ message: 'Voucher posted to ledger.' });
  } catch (err) { next(err); }
});

accountingRouter.post('/vouchers/:id/cancel', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { reason } = req.body;
    const existing = await query(`SELECT status FROM acc_vouchers WHERE id = $1`, [id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Voucher not found.' });
    if (existing.rows[0].status === 'Cancelled') {
      return res.status(400).json({ message: 'Voucher already cancelled.' });
    }

    if (existing.rows[0].status === 'Posted') {
      const lines = await query(`SELECT DISTINCT account_id FROM acc_voucher_lines WHERE voucher_id = $1`, [id]);
      await query(`DELETE FROM acc_ledger WHERE voucher_id = $1`, [id]);
      for (const line of lines.rows) {
        await recalcAccountBalance(line.account_id);
      }
    }

    await query(
      `UPDATE acc_vouchers SET status = 'Cancelled', cancelled_by = $1, cancelled_at = $2, cancel_reason = $3 WHERE id = $4`,
      [req.user?.id || null, new Date(), reason || null, id]
    );

    res.json({ message: 'Voucher cancelled.' });
  } catch (err) { next(err); }
});

// ── Ledger ──────────────────────────────────────────────────────────────────

accountingRouter.get('/ledger', async (req, res, next) => {
  try {
    const { account_id, from, to, limit = 100, offset = 0 } = req.query;
    const params = [];
    const clauses = [];

    if (account_id) { params.push(Number(account_id)); clauses.push(`l.account_id = $${params.length}`); }
    if (from) { params.push(from); clauses.push(`l.date >= $${params.length}`); }
    if (to) { params.push(to); clauses.push(`l.date <= $${params.length}`); }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const countResult = await query(`SELECT COUNT(*)::int AS total FROM acc_ledger l ${where}`, params);

    params.push(Math.min(Number(limit), 500), Math.max(Number(offset), 0));
    const result = await query(
      `SELECT l.id, l.date, l.debit::float8, l.credit::float8, l.running_balance::float8,
              a.code AS account_code, a.name AS account_name,
              v.voucher_no, v.narration, v.voucher_type
       FROM acc_ledger l
       JOIN acc_accounts a ON a.id = l.account_id
       JOIN acc_vouchers v ON v.id = l.voucher_id
       ${where}
       ORDER BY l.date DESC, l.id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: result.rows, total: countResult.rows[0].total });
  } catch (err) { next(err); }
});

// ── Reports ─────────────────────────────────────────────────────────────────

accountingRouter.get('/reports/trial-balance', async (req, res, next) => {
  try {
    const { as_of } = req.query;
    const dateFilter = as_of ? `AND l.date <= '${as_of}'` : '';

    const result = await query(
      `SELECT a.id, a.code, a.name, a.account_type,
              COALESCE(SUM(l.debit), 0)::float8 AS total_debit,
              COALESCE(SUM(l.credit), 0)::float8 AS total_credit,
              (COALESCE(SUM(l.credit), 0) - COALESCE(SUM(l.debit), 0))::float8 AS net_balance
       FROM acc_accounts a
       LEFT JOIN acc_ledger l ON l.account_id = a.id ${dateFilter}
       WHERE a.is_active = TRUE
       GROUP BY a.id, a.code, a.name, a.account_type
       HAVING COALESCE(SUM(l.debit), 0) != 0 OR COALESCE(SUM(l.credit), 0) != 0
       ORDER BY a.code`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

accountingRouter.get('/reports/income-expense', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const params = [];
    const clauses = [];
    if (from) { params.push(from); clauses.push(`l.date >= $${params.length}`); }
    if (to) { params.push(to); clauses.push(`l.date <= $${params.length}`); }
    const where = clauses.length ? `AND ${clauses.join(' AND ')}` : '';

    const result = await query(
      `SELECT a.id, a.code, a.name, a.account_type,
              COALESCE(SUM(l.credit) - SUM(l.debit), 0)::float8 AS amount
       FROM acc_accounts a
       LEFT JOIN acc_ledger l ON l.account_id = a.id ${where}
       WHERE a.account_type IN ('Income', 'Expense') AND a.is_active = TRUE
       GROUP BY a.id, a.code, a.name, a.account_type
       ORDER BY a.account_type DESC, a.code`,
      params
    );

    const income = result.rows.filter((r) => r.account_type === 'Income');
    const expense = result.rows.filter((r) => r.account_type === 'Expense');
    const totalIncome = income.reduce((s, r) => s + Number(r.amount), 0);
    const totalExpense = expense.reduce((s, r) => s + Math.abs(Number(r.amount)), 0);

    res.json({ income, expense, total_income: totalIncome, total_expense: totalExpense, net: totalIncome - totalExpense });
  } catch (err) { next(err); }
});

accountingRouter.get('/reports/cash-book', async (req, res, next) => {
  try {
    const { from, to, account_id } = req.query;
    const params = [];
    const clauses = [`a.account_type = 'Asset'`];

    if (account_id) { params.push(Number(account_id)); clauses.push(`l.account_id = $${params.length}`); }
    if (from) { params.push(from); clauses.push(`l.date >= $${params.length}`); }
    if (to) { params.push(to); clauses.push(`l.date <= $${params.length}`); }

    const where = `WHERE ${clauses.join(' AND ')}`;

    const result = await query(
      `SELECT l.id, l.date, l.debit::float8, l.credit::float8, l.running_balance::float8,
              a.code AS account_code, a.name AS account_name,
              v.voucher_no, v.narration, v.voucher_type
       FROM acc_ledger l
       JOIN acc_accounts a ON a.id = l.account_id
       JOIN acc_vouchers v ON v.id = l.voucher_id
       ${where}
       ORDER BY l.date ASC, l.id ASC`,
      params
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ── Dashboard Summary ───────────────────────────────────────────────────────

accountingRouter.get('/dashboard', async (req, res, next) => {
  try {
    const [vouchers, income, expense, cashBalance, recent] = await Promise.all([
      query(`SELECT
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE status = 'Draft')::int AS draft,
               COUNT(*) FILTER (WHERE status = 'Submitted')::int AS submitted,
               COUNT(*) FILTER (WHERE status = 'Approved')::int AS approved,
               COUNT(*) FILTER (WHERE status = 'Posted')::int AS posted
             FROM acc_vouchers`),
      query(`SELECT COALESCE(SUM(credit - debit), 0)::float8 AS total
             FROM acc_ledger l JOIN acc_accounts a ON a.id = l.account_id
             WHERE a.account_type = 'Income'`),
      query(`SELECT COALESCE(SUM(debit - credit), 0)::float8 AS total
             FROM acc_ledger l JOIN acc_accounts a ON a.id = l.account_id
             WHERE a.account_type = 'Expense'`),
      query(`SELECT COALESCE(SUM(credit - debit), 0)::float8 AS balance
             FROM acc_ledger l JOIN acc_accounts a ON a.id = l.account_id
             WHERE a.account_type = 'Asset'`),
      query(`SELECT v.voucher_no, v.voucher_type, v.date, v.narration, v.status, v.total_amount::float8
             FROM acc_vouchers v ORDER BY v.created_at DESC LIMIT 5`),
    ]);

    res.json({
      voucher_counts: vouchers.rows[0],
      total_income: income.rows[0].total,
      total_expense: expense.rows[0].total,
      net_surplus: income.rows[0].total - expense.rows[0].total,
      cash_balance: cashBalance.rows[0].balance,
      recent_vouchers: recent.rows,
    });
  } catch (err) { next(err); }
});
