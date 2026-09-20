import { Router } from 'express';
import { toWhatsAppChatId, sendText } from '../services/whatsappService.js';

// Internal-only: lets other backend services (e.g. the central notification
// service) send a plain WhatsApp message without going through a lead — no
// lead_id, no thread persistence, just a direct send. Guarded by the shared
// X-Internal-Secret header rather than a user JWT, same pattern as
// backend's own /notifications/internal/send.
export const whatsappInternalRouter = Router();

whatsappInternalRouter.post('/', async (req, res, next) => {
  try {
    const secret = req.headers['x-internal-secret'];
    if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { phone, text } = req.body || {};
    if (!phone || !text?.trim()) {
      return res.status(400).json({ message: 'phone and text are required' });
    }

    const chatId = toWhatsAppChatId(phone);
    if (!chatId) {
      return res.status(400).json({ message: 'Not a usable WhatsApp/phone number' });
    }

    const result = await sendText(chatId, text.trim());
    res.status(201).json({ ok: true, messageId: result?.id || result?.messageId || null });
  } catch (err) {
    if (err.status === 429) {
      return res.status(429).json({ message: err.message, code: err.code || 'SEND_PACING_LIMITED' });
    }
    next(err);
  }
});
