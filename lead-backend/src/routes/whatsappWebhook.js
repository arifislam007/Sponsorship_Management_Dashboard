import { Router } from 'express';
import { query } from '../db.js';
import { verifyWebhookSignature, toWhatsAppChatId } from '../services/whatsappService.js';

export const whatsappWebhookRouter = Router();

// Digits-only comparison helper, mirrors normalizePhone() in routes/leads.js.
function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

// Strip a WhatsApp chat/contact id (e.g. "8801712345678@c.us") down to its
// digits so it can be matched against lead_leads.phone regardless of the
// free-text format that phone was stored in.
function digitsFromChatId(value) {
  return digitsOnly(String(value || '').split('@')[0]);
}

async function findLeadIdForChatId(chatIdOrFrom) {
  const digits = digitsFromChatId(chatIdOrFrom);
  if (!digits) return null;

  // Compare against the last 10 digits (local number) so it matches regardless
  // of whether lead_leads.phone was stored with/without country code or a
  // leading 0, mirroring the normalization tolerance used elsewhere.
  const localDigits = digits.slice(-10);
  if (!localDigits) return null;

  const result = await query(
    `SELECT id FROM lead_leads
     WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = $1
     LIMIT 1`,
    [localDigits]
  );
  return result.rows.length ? result.rows[0].id : null;
}

async function handleMessageReceived(event) {
  // Be defensive: the exact payload shape from OpenWA isn't 100% confirmed,
  // so log the raw event and tolerate missing optional fields.
  console.log('[whatsapp webhook] message.received', JSON.stringify(event));

  const data = event?.data || event;
  const externalMessageId = data?.id ?? null;
  const chatId = data?.chatId || data?.from || null;
  const fromMe = Boolean(data?.fromMe);
  const isGroup = Boolean(data?.isGroup) || (typeof chatId === 'string' && chatId.endsWith('@g.us'));
  const body = typeof data?.body === 'string' ? data.body : null;
  const messageType = data?.type || 'text';

  if (!chatId) {
    console.warn('[whatsapp webhook] message.received event missing chatId/from, skipping');
    return;
  }

  // Only try to associate 1:1 (non-group) messages with a lead.
  const leadId = isGroup ? null : await findLeadIdForChatId(chatId).catch((err) => {
    console.error('[whatsapp webhook] failed to match lead for chatId', chatId, err.message);
    return null;
  });

  try {
    await query(
      `INSERT INTO lead_whatsapp_messages
         (lead_id, external_message_id, chat_id, direction, message_type, body, from_me, is_group, status)
       VALUES ($1,$2,$3,'inbound',$4,$5,$6,$7,'received')
       ON CONFLICT (external_message_id) DO NOTHING`,
      [leadId, externalMessageId, chatId, messageType, body, fromMe, isGroup]
    );
  } catch (err) {
    // The partial unique index only applies when external_message_id IS NOT
    // NULL; a duplicate-key error for any other reason should still be logged
    // but must not crash the process or cause a webhook retry storm.
    console.error('[whatsapp webhook] failed to persist inbound message', err.message);
  }
}

whatsappWebhookRouter.post('/', async (req, res) => {
  const signatureHeader = req.headers['x-openwa-signature'];
  const rawBody = req.rawBody;

  if (!verifyWebhookSignature(rawBody, signatureHeader)) {
    return res.status(401).json({ message: 'Invalid webhook signature' });
  }

  // Per OpenWA's guidance, reply 200 quickly. For v1 the only work done here
  // is a single fast insert, so it's done inline before responding rather
  // than introducing a queue. Any parsing/matching failure is caught so a
  // malformed/unexpected payload still gets a 200 (avoiding retry storms)
  // instead of crashing the process.
  try {
    const event = req.body || {};
    const eventType = event.event || event.type;

    if (eventType === 'message.received') {
      await handleMessageReceived(event);
    } else if (eventType === 'session.status') {
      console.log('[whatsapp webhook] session.status', JSON.stringify(event));
    } else {
      console.log('[whatsapp webhook] unhandled event type', eventType, JSON.stringify(event));
    }
  } catch (err) {
    console.error('[whatsapp webhook] error processing event', err.message);
  }

  res.status(200).json({ received: true });
});
