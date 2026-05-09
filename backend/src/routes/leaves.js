import { Router } from 'express';
import { query } from '../db.js';
import { requirePermission } from '../middleware/auth.js';

export const leavesRouter = Router();

function startOfCurrentMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function calculateInclusiveDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;
}

async function getUserRow(userId) {
  const result = await query('SELECT id, username, full_name, created_at FROM users WHERE id = $1', [userId]);
  return result.rows[0] || null;
}

async function getOrCreateBalance(userId) {
  const user = await getUserRow(userId);
  if (!user) {
    throw new Error('User not found.');
  }

  const balanceResult = await query(
    `SELECT user_id, casual_balance::float8 AS casual_balance, special_balance::float8 AS special_balance,
            special_last_accrued_at
     FROM leave_balances
     WHERE user_id = $1`,
    [userId]
  );

  const defaultAccrualMonth = formatDate(new Date(user.created_at));
  if (!balanceResult.rows.length) {
    const inserted = await query(
      `INSERT INTO leave_balances (user_id, casual_balance, special_balance, special_last_accrued_at)
       VALUES ($1, 12, 0, $2)
       RETURNING user_id, casual_balance::float8 AS casual_balance, special_balance::float8 AS special_balance, special_last_accrued_at`,
      [userId, defaultAccrualMonth]
    );

    balanceResult.rows.push(inserted.rows[0]);
  }

  const balance = balanceResult.rows[0];
  const lastAccruedAt = balance.special_last_accrued_at ? new Date(balance.special_last_accrued_at) : new Date(user.created_at);
  const currentMonth = startOfCurrentMonth();
  const lastMonth = new Date(lastAccruedAt);
  lastMonth.setDate(1);
  lastMonth.setHours(0, 0, 0, 0);

  const monthsToAccrue = (currentMonth.getFullYear() - lastMonth.getFullYear()) * 12 + (currentMonth.getMonth() - lastMonth.getMonth());

  if (monthsToAccrue > 0) {
    await query(
      `UPDATE leave_balances
       SET special_balance = special_balance + $2,
           special_last_accrued_at = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId, monthsToAccrue, formatDate(currentMonth)]
    );

    balance.special_balance += monthsToAccrue;
    balance.special_last_accrued_at = formatDate(currentMonth);
  }

  return {
    user_id: user.id,
    username: user.username,
    full_name: user.full_name,
    casual_balance: Number(balance.casual_balance || 0),
    special_balance: Number(balance.special_balance || 0),
    special_last_accrued_at: balance.special_last_accrued_at,
  };
}

async function getAllBalances() {
  const result = await query(
    `SELECT
       u.id AS user_id,
       u.username,
       u.full_name,
       COALESCE(lb.casual_balance, 12)::float8 AS casual_balance,
       COALESCE(lb.special_balance, 0)::float8 AS special_balance,
       lb.special_last_accrued_at
     FROM users u
     LEFT JOIN leave_balances lb ON lb.user_id = u.id
     ORDER BY u.full_name ASC, u.username ASC`
  );

  return result.rows.map((row) => ({
    ...row,
    casual_balance: Number(row.casual_balance || 0),
    special_balance: Number(row.special_balance || 0),
  }));
}

async function getLeaveRequests(whereClause = '', params = []) {
  const result = await query(
    `SELECT
       lr.id,
       lr.user_id,
       u.username,
       u.full_name,
       lr.leave_type,
       lr.start_date,
       lr.end_date,
       lr.days_requested::float8 AS days_requested,
       lr.reason,
       lr.status,
       lr.reviewed_by,
       reviewer.full_name AS reviewed_by_name,
       lr.reviewed_at,
       lr.remarks,
       lr.created_at
     FROM leave_requests lr
     JOIN users u ON u.id = lr.user_id
     LEFT JOIN users reviewer ON reviewer.id = lr.reviewed_by
     ${whereClause}
     ORDER BY lr.created_at DESC, lr.id DESC`,
    params
  );

  return result.rows.map((row) => ({
    ...row,
    days_requested: Number(row.days_requested || 0),
    leave_type: String(row.leave_type),
    status: String(row.status),
  }));
}

leavesRouter.get('/overview', requirePermission('view'), async (req, res, next) => {
  try {
    const currentUserBalance = await getOrCreateBalance(req.user.userId);
    const balances = await getAllBalances();
    const requests = await getLeaveRequests();

    res.json({
      current_user_balance: currentUserBalance,
      balances,
      requests,
    });
  } catch (error) {
    next(error);
  }
});

leavesRouter.get('/requests', requirePermission('view'), async (req, res, next) => {
  try {
    const userId = req.query.user_id ? Number(req.query.user_id) : null;
    const status = String(req.query.status || '').trim();

    const whereParts = [];
    const params = [];

    if (userId) {
      params.push(userId);
      whereParts.push(`lr.user_id = $${params.length}`);
    }

    if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) {
      params.push(status);
      whereParts.push(`lr.status = $${params.length}`);
    }

    const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
    const requests = await getLeaveRequests(whereClause, params);

    res.json({ requests });
  } catch (error) {
    next(error);
  }
});

leavesRouter.post('/requests', requirePermission('create'), async (req, res, next) => {
  try {
    const userId = Number(req.body.user_id || req.user.userId);
    const { leave_type, start_date, end_date, reason } = req.body;

    if (!leave_type || !['Casual', 'Special'].includes(leave_type)) {
      return res.status(400).json({ message: 'leave_type must be Casual or Special.' });
    }

    if (!start_date || !end_date || !reason) {
      return res.status(400).json({ message: 'start_date, end_date and reason are required.' });
    }

    const daysRequested = calculateInclusiveDays(start_date, end_date);
    if (!Number.isFinite(daysRequested) || daysRequested <= 0) {
      return res.status(400).json({ message: 'Invalid leave dates.' });
    }

    const user = await getUserRow(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await getOrCreateBalance(userId);

    const insertResult = await query(
      `INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, days_requested, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, leave_type, start_date, end_date, daysRequested, reason.trim()]
    );

    const createdRequest = await getLeaveRequests('WHERE lr.id = $1', [insertResult.rows[0].id]);

    return res.status(201).json({ request: createdRequest[0] });
  } catch (error) {
    next(error);
  }
});

leavesRouter.patch('/requests/:id/status', requirePermission('edit'), async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);
    const { status, remarks } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be Approved or Rejected.' });
    }

    const requestResult = await query(
      `SELECT lr.*, u.full_name, u.username
       FROM leave_requests lr
       JOIN users u ON u.id = lr.user_id
       WHERE lr.id = $1`,
      [requestId]
    );

    const leaveRequest = requestResult.rows[0];
    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found.' });
    }

    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending requests can be updated.' });
    }

    if (status === 'Approved') {
      const balance = await getOrCreateBalance(leaveRequest.user_id);
      const requestedDays = Number(leaveRequest.days_requested || 0);

      if (leaveRequest.leave_type === 'Special') {
        if (balance.special_balance < requestedDays) {
          return res.status(400).json({ message: 'Insufficient special leave balance.' });
        }

        await query(
          `UPDATE leave_balances
           SET special_balance = special_balance - $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1`,
          [leaveRequest.user_id, requestedDays]
        );
      } else {
        if (balance.casual_balance < requestedDays) {
          return res.status(400).json({ message: 'Insufficient casual leave balance.' });
        }

        await query(
          `UPDATE leave_balances
           SET casual_balance = casual_balance - $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1`,
          [leaveRequest.user_id, requestedDays]
        );
      }
    }

    await query(
      `UPDATE leave_requests
       SET status = $2,
           reviewed_by = $3,
           reviewed_at = CURRENT_TIMESTAMP,
           remarks = $4
       WHERE id = $1`,
      [requestId, status, req.user.userId, remarks || null]
    );

    const updatedRequest = await getLeaveRequests('WHERE lr.id = $1', [requestId]);

    return res.json({ request: updatedRequest[0] });
  } catch (error) {
    next(error);
  }
});