import crypto from 'crypto';
import { config } from '../config.js';

// ── Phone → WhatsApp chat ID normalization ──────────────────────────────────
//
// lead_leads.phone is free-text (no enforced format). Accepts things like
// "01712345678", "+8801712345678", "8801712345678", "1712345678" and
// normalizes to the "8801XXXXXXXXX" form OpenWA expects, returning a full
// chat ID like "8801712345678@c.us". Returns null (never throws) if the
// input can't plausibly be normalized to a BD mobile number.
export function toWhatsAppChatId(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;

  let normalized = null;
  if (digits.startsWith('880') && digits.length === 13) {
    normalized = digits;
  } else if (digits.startsWith('0') && digits.length === 11) {
    // e.g. "01712345678" -> "88" + "01712345678" == "880" + "1712345678"
    normalized = `88${digits}`;
  } else if (digits.length === 10) {
    // e.g. "1712345678" (leading 0 already stripped) -> "880" + digits
    normalized = `880${digits}`;
  }

  // Plausibility check: BD mobile numbers are 8801XXXXXXXXX (13 digits total,
  // starting with 8801).
  if (!normalized || normalized.length !== 13 || !normalized.startsWith('8801')) {
    return null;
  }

  return `${normalized}@c.us`;
}

function assertConfigured() {
  if (!config.openwa.apiKey || !config.openwa.sessionId) {
    throw new Error('WhatsApp integration not configured (missing OPENWA_API_KEY / OPENWA_SESSION_ID)');
  }
}

function endpoint(path) {
  const base = (config.openwa.apiUrl || '').replace(/\/+$/, '');
  return `${base}/sessions/${encodeURIComponent(config.openwa.sessionId)}${path}`;
}

async function postToOpenWA(path, body) {
  assertConfigured();

  let res;
  try {
    res = await fetch(endpoint(path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.openwa.apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const wrapped = new Error(`Failed to reach WhatsApp gateway: ${err.message}`);
    wrapped.cause = err;
    throw wrapped;
  }

  const payload = await res.json().catch(() => ({}));

  if (res.status === 429) {
    const err = new Error(payload?.message || 'WhatsApp rate limit reached, please retry shortly');
    err.code = payload?.code || 'SEND_PACING_LIMITED';
    err.status = 429;
    err.retryAfterSeconds = payload?.retryAfterSeconds ?? null;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(payload?.message || `OpenWA request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return payload;
}

export function sendText(chatId, text) {
  return postToOpenWA('/messages/send-text', { chatId, text });
}

export function sendImage(chatId, { url, base64, mimetype, caption } = {}) {
  const body = { chatId, caption };
  if (url) body.url = url;
  if (base64) { body.base64 = base64; body.mimetype = mimetype; }
  return postToOpenWA('/messages/send-image', body);
}

export function sendDocument(chatId, { url, base64, mimetype, filename, caption } = {}) {
  const body = { chatId, filename, caption };
  if (url) body.url = url;
  if (base64) { body.base64 = base64; body.mimetype = mimetype; }
  return postToOpenWA('/messages/send-document', body);
}

// ── Webhook signature verification ──────────────────────────────────────────
//
// OpenWA signs the raw request body with HMAC-SHA256 using our shared secret,
// sent as `X-OpenWA-Signature: sha256=<hex>`. Verify with a timing-safe
// comparison. Never throws; missing/malformed input just returns false.
export function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!config.openwa.webhookSecret) return false;
  if (!signatureHeader || typeof signatureHeader !== 'string') return false;

  const match = signatureHeader.match(/^sha256=([0-9a-f]+)$/i);
  if (!match) return false;

  const provided = match[1].toLowerCase();

  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody || '', 'utf-8');
  const expected = crypto
    .createHmac('sha256', config.openwa.webhookSecret)
    .update(bodyBuffer)
    .digest('hex');

  const providedBuffer = Buffer.from(provided, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  if (providedBuffer.length !== expectedBuffer.length) return false;

  try {
    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
