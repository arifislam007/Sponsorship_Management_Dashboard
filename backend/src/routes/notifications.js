import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import {
  getVapidPublicKey,
  testChannel,
  notify,
} from '../services/notificationService.js';

const adminOnly = roleMiddleware('admin');

export const notificationsRouter = Router();

// ── Public: VAPID public key (needed before auth for SW subscription) ─────────
notificationsRouter.get('/vapid-key', async (req, res, next) => {
  try {
    const key = await getVapidPublicKey();
    res.json({ publicKey: key });
  } catch (err) { next(err); }
});

// ── Internal endpoint (called by other backends) ──────────────────────────────
notificationsRouter.post('/internal/send', async (req, res, next) => {
  try {
    const secret = req.headers['x-internal-secret'];
    if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const { userId, eventType, title, body, url } = req.body;
    if (!userId || !title) return res.status(400).json({ message: 'userId and title required' });
    await notify(userId, eventType || 'system', title, body || '', url || '/');
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// All routes below require authentication
notificationsRouter.use(authMiddleware);

// ── Admin: notification server config (SMTP + Telegram) ───────────────────────
notificationsRouter.get('/config', adminOnly, async (req, res, next) => {
  try {
    const r = await query('SELECT id, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_from, telegram_bot_token, vapid_public_key, vapid_subject, updated_at FROM notification_config WHERE id = 1');
    res.json(r.rows[0] || {});
  } catch (err) { next(err); }
});

notificationsRouter.put('/config', adminOnly, async (req, res, next) => {
  try {
    const { smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from, telegram_bot_token, vapid_subject } = req.body;
    // Only update smtp_pass if provided (non-empty)
    if (smtp_pass) {
      await query(
        `UPDATE notification_config SET
           smtp_host = $1, smtp_port = $2, smtp_secure = $3,
           smtp_user = $4, smtp_pass = $5, smtp_from = $6,
           telegram_bot_token = $7, vapid_subject = $8, updated_at = NOW()
         WHERE id = 1`,
        [smtp_host || null, Number(smtp_port) || 587, smtp_secure || false,
         smtp_user || null, smtp_pass, smtp_from || null,
         telegram_bot_token || null, vapid_subject || 'mailto:admin@sombhabona.org']
      );
    } else {
      await query(
        `UPDATE notification_config SET
           smtp_host = $1, smtp_port = $2, smtp_secure = $3,
           smtp_user = $4, smtp_from = $5,
           telegram_bot_token = $6, vapid_subject = $7, updated_at = NOW()
         WHERE id = 1`,
        [smtp_host || null, Number(smtp_port) || 587, smtp_secure || false,
         smtp_user || null, smtp_from || null,
         telegram_bot_token || null, vapid_subject || 'mailto:admin@sombhabona.org']
      );
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── Per-user notification preferences ─────────────────────────────────────────
notificationsRouter.get('/preferences', async (req, res, next) => {
  try {
    const r = await query('SELECT * FROM notification_preferences WHERE user_id = $1', [req.user.userId]);
    res.json(r.rows[0] || {
      email_enabled: false, email_address: req.user.email || '',
      telegram_enabled: false, telegram_chat_id: '',
      web_push_enabled: true,
      notify_task_assigned: true, notify_leave_update: true, notify_system: true,
    });
  } catch (err) { next(err); }
});

notificationsRouter.put('/preferences', async (req, res, next) => {
  try {
    const {
      email_enabled, email_address,
      telegram_enabled, telegram_chat_id,
      web_push_enabled,
      notify_task_assigned, notify_leave_update, notify_system,
    } = req.body;
    await query(
      `INSERT INTO notification_preferences
         (user_id, email_enabled, email_address, telegram_enabled, telegram_chat_id,
          web_push_enabled, notify_task_assigned, notify_leave_update, notify_system, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         email_enabled = $2, email_address = $3,
         telegram_enabled = $4, telegram_chat_id = $5,
         web_push_enabled = $6,
         notify_task_assigned = $7, notify_leave_update = $8, notify_system = $9,
         updated_at = NOW()`,
      [req.user.userId,
       email_enabled ?? false, email_address || null,
       telegram_enabled ?? false, telegram_chat_id || null,
       web_push_enabled ?? true,
       notify_task_assigned ?? true, notify_leave_update ?? true, notify_system ?? true]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── Web Push subscriptions ─────────────────────────────────────────────────────
notificationsRouter.post('/subscribe', async (req, res, next) => {
  try {
    const { endpoint, p256dh, auth } = req.body;
    if (!endpoint) return res.status(400).json({ message: 'endpoint required' });
    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = $1, p256dh = $3, auth = $4`,
      [req.user.userId, endpoint, p256dh || null, auth || null]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

notificationsRouter.delete('/subscribe', async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [endpoint, req.user.userId]);
    } else {
      await query('DELETE FROM push_subscriptions WHERE user_id = $1', [req.user.userId]);
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── Notification log ───────────────────────────────────────────────────────────
notificationsRouter.get('/log', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const r = await query(
      `SELECT * FROM notification_log WHERE user_id = $1 ORDER BY sent_at DESC LIMIT $2`,
      [req.user.userId, limit]
    );
    const unread = await query(
      `SELECT COUNT(*)::int AS count FROM notification_log WHERE user_id = $1 AND read_at IS NULL`,
      [req.user.userId]
    );
    res.json({ logs: r.rows, unread: unread.rows[0].count });
  } catch (err) { next(err); }
});

notificationsRouter.post('/log/read-all', async (req, res, next) => {
  try {
    await query(
      `UPDATE notification_log SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`,
      [req.user.userId]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── Test notifications ─────────────────────────────────────────────────────────
notificationsRouter.post('/test', async (req, res, next) => {
  try {
    const { channel } = req.body;
    if (!['email', 'telegram', 'web'].includes(channel)) {
      return res.status(400).json({ message: 'channel must be email, telegram, or web' });
    }
    await testChannel(req.user.userId, channel);
    res.json({ ok: true });
  } catch (err) { next(err); }
});
