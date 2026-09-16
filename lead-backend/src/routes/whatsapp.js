import { Router } from 'express';
import { query } from '../db.js';
import { toWhatsAppChatId, sendText } from '../services/whatsappService.js';

export const whatsappRouter = Router();

// ── Send a WhatsApp text message to a lead ──────────────────────────────────

whatsappRouter.post('/send', async (req, res, next) => {
  try {
    const { lead_id, text } = req.body || {};
    const leadId = Number(lead_id);
    if (!leadId || !text?.trim()) {
      return res.status(400).json({ message: 'lead_id and text are required' });
    }

    const leadResult = await query('SELECT id, phone FROM lead_leads WHERE id = $1', [leadId]);
    if (!leadResult.rows.length) return res.status(404).json({ message: 'Lead not found' });

    const chatId = toWhatsAppChatId(leadResult.rows[0].phone);
    if (!chatId) {
      return res.status(400).json({ message: 'This lead does not have a usable WhatsApp/phone number' });
    }

    let sendResult;
    try {
      sendResult = await sendText(chatId, text.trim());
    } catch (err) {
      if (err.status === 429) {
        return res.status(429).json({
          message: err.message,
          code: err.code || 'SEND_PACING_LIMITED',
          retryAfterSeconds: err.retryAfterSeconds ?? null,
        });
      }
      throw err;
    }

    const externalMessageId = sendResult?.id || sendResult?.messageId || null;

    const inserted = await query(
      `INSERT INTO lead_whatsapp_messages
         (lead_id, external_message_id, chat_id, direction, message_type, body, from_me, is_group, status, created_by)
       VALUES ($1,$2,$3,'outbound','text',$4,true,false,'sent',$5)
       RETURNING *`,
      [leadId, externalMessageId, chatId, text.trim(), req.user.userId]
    );

    res.status(201).json(inserted.rows[0]);
  } catch (err) { next(err); }
});

// ── Message thread for a lead ────────────────────────────────────────────────

whatsappRouter.get('/:leadId', async (req, res, next) => {
  try {
    const leadId = Number(req.params.leadId);
    if (!leadId) return res.status(400).json({ message: 'Invalid lead id' });

    const { limit = 100, offset = 0 } = req.query;

    const result = await query(
      `SELECT * FROM lead_whatsapp_messages
       WHERE lead_id = $1
       ORDER BY created_at ASC
       LIMIT $2 OFFSET $3`,
      [leadId, Math.min(Number(limit) || 100, 500), Math.max(Number(offset) || 0, 0)]
    );

    res.json({ data: result.rows });
  } catch (err) { next(err); }
});
