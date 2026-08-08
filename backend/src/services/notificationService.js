import { query } from '../db.js';
import nodemailer from 'nodemailer';
import webpush from 'web-push';

async function getConfig() {
  const r = await query('SELECT * FROM notification_config WHERE id = 1');
  return r.rows[0] || {};
}

async function getPrefs(userId) {
  const r = await query('SELECT * FROM notification_preferences WHERE user_id = $1', [userId]);
  return r.rows[0] || null;
}

async function logNotif(userId, channel, eventType, title, body, status, error) {
  try {
    await query(
      `INSERT INTO notification_log (user_id, channel, event_type, title, body, status, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, channel, eventType, title?.slice(0, 255), body, status, error || null]
    );
  } catch { /* non-fatal */ }
}

export async function initVapidKeys() {
  try {
    const cfg = await getConfig();
    if (cfg.vapid_public_key && cfg.vapid_private_key) {
      webpush.setVapidDetails(
        cfg.vapid_subject || 'mailto:admin@sombhabona.org',
        cfg.vapid_public_key,
        cfg.vapid_private_key
      );
      return;
    }
    const keys = webpush.generateVAPIDKeys();
    await query(
      `UPDATE notification_config SET vapid_public_key = $1, vapid_private_key = $2, updated_at = NOW() WHERE id = 1`,
      [keys.publicKey, keys.privateKey]
    );
    webpush.setVapidDetails('mailto:admin@sombhabona.org', keys.publicKey, keys.privateKey);
    console.log('VAPID keys generated and stored.');
  } catch (err) {
    console.error('VAPID init failed:', err.message);
  }
}

export async function getVapidPublicKey() {
  const cfg = await getConfig();
  return cfg.vapid_public_key || null;
}

async function sendEmailNotif(userId, eventType, subject, htmlBody) {
  const cfg = await getConfig();
  if (!cfg.smtp_host || !cfg.smtp_user) return;

  const prefs = await getPrefs(userId);
  if (!prefs?.email_enabled || !prefs?.email_address) return;

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.smtp_host,
      port: Number(cfg.smtp_port) || 587,
      secure: cfg.smtp_secure || false,
      auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
    });
    await transporter.sendMail({
      from: cfg.smtp_from || cfg.smtp_user,
      to: prefs.email_address,
      subject,
      html: htmlBody,
    });
    await logNotif(userId, 'email', eventType, subject, htmlBody, 'sent', null);
  } catch (err) {
    await logNotif(userId, 'email', eventType, subject, htmlBody, 'failed', err.message);
  }
}

async function sendTelegramNotif(userId, eventType, title, body) {
  const cfg = await getConfig();
  if (!cfg.telegram_bot_token) return;

  const prefs = await getPrefs(userId);
  if (!prefs?.telegram_enabled || !prefs?.telegram_chat_id) return;

  const message = `<b>${title}</b>\n${body}`;
  try {
    const res = await fetch(`https://api.telegram.org/bot${cfg.telegram_bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: prefs.telegram_chat_id, text: message, parse_mode: 'HTML' }),
    });
    if (!res.ok) throw new Error(await res.text());
    await logNotif(userId, 'telegram', eventType, title, body, 'sent', null);
  } catch (err) {
    await logNotif(userId, 'telegram', eventType, title, body, 'failed', err.message);
  }
}

async function sendWebPushNotif(userId, eventType, title, body, url = '/') {
  const prefs = await getPrefs(userId);
  if (prefs?.web_push_enabled === false) return;

  const subs = await query('SELECT * FROM push_subscriptions WHERE user_id = $1', [userId]);
  if (!subs.rows.length) return;

  const payload = JSON.stringify({ title, body, url });

  await Promise.allSettled(
    subs.rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        await logNotif(userId, 'web', eventType, title, body, 'sent', null);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
        }
        await logNotif(userId, 'web', eventType, title, body, 'failed', err.message);
      }
    })
  );
}

export async function notify(userId, eventType, title, body, url = '/') {
  if (!userId) return;
  try {
    const prefs = await getPrefs(userId);
    if (eventType === 'task_assigned' && prefs?.notify_task_assigned === false) return;
    if (eventType === 'leave_update' && prefs?.notify_leave_update === false) return;

    const emailHtml = `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#14856E">${title}</h2>
        <p>${body}</p>
        <hr/>
        <p style="font-size:12px;color:#888">Sombhabona Foundation</p>
      </div>`;

    await Promise.allSettled([
      sendWebPushNotif(userId, eventType, title, body, url),
      sendEmailNotif(userId, eventType, title, emailHtml),
      sendTelegramNotif(userId, eventType, title, body),
    ]);
  } catch (err) {
    console.error('notify() error:', err.message);
  }
}

export async function notifyMany(userIds, eventType, title, body, url = '/') {
  await Promise.allSettled(userIds.map((id) => notify(id, eventType, title, body, url)));
}

// Send an email to any address (not limited to user prefs)
// attachments: [{cid, content (base64 string), contentType, filename}]
export async function sendDirectEmail(to, subject, html, attachments = []) {
  const cfg = await getConfig();
  if (!cfg.smtp_host || !cfg.smtp_user) {
    throw new Error('SMTP not configured. Please set up email in Admin → Notifications.');
  }
  const transporter = nodemailer.createTransport({
    host: cfg.smtp_host,
    port: Number(cfg.smtp_port) || 587,
    secure: cfg.smtp_secure || false,
    auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
  });
  const mailAttachments = attachments.map(a => ({
    cid: a.cid,
    filename: a.filename,
    content: Buffer.from(a.content, 'base64'),
    contentType: a.contentType,
  }));
  await transporter.sendMail({
    from: cfg.smtp_from || cfg.smtp_user,
    to,
    subject,
    html,
    attachments: mailAttachments,
  });
}

// Test a single channel for an admin
export async function testChannel(userId, channel) {
  const title = 'Test Notification';
  const body = 'This is a test from Sombhabona notification system.';
  if (channel === 'email') {
    await sendEmailNotif(userId, 'test', title, `<p>${body}</p>`);
  } else if (channel === 'telegram') {
    await sendTelegramNotif(userId, 'test', title, body);
  } else if (channel === 'web') {
    await sendWebPushNotif(userId, 'test', title, body, '/');
  }
}
