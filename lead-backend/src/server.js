import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { ensureSchema } from './db.js';
import { authMiddleware, moduleAccessMiddleware } from './middleware/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { coursesRouter } from './routes/courses.js';
import { leadsRouter } from './routes/leads.js';
import { institutesRouter } from './routes/institutes.js';
import { followupsRouter } from './routes/followups.js';
import { reportsRouter } from './routes/reports.js';
import { sheetSyncRouter } from './routes/sheetSync.js';
import { whatsappRouter } from './routes/whatsapp.js';
import { whatsappWebhookRouter } from './routes/whatsappWebhook.js';
import { whatsappInternalRouter } from './routes/whatsappInternal.js';

const app = express();
app.use(express.json({
  limit: '10mb',
  // Capture the raw request body so the WhatsApp webhook route can verify
  // OpenWA's HMAC signature against the exact bytes that were sent.
  verify: (req, res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', service: 'lead-service', timestamp: new Date() })
);

const leadAccess = moduleAccessMiddleware('Lead Management');
app.use('/api/leads/dashboard',  authMiddleware, leadAccess, dashboardRouter);
app.use('/api/leads/courses',    authMiddleware, leadAccess, coursesRouter);
app.use('/api/leads/followups',  authMiddleware, leadAccess, followupsRouter);
app.use('/api/leads/reports',    authMiddleware, leadAccess, reportsRouter);
app.use('/api/leads/sheet-sync', authMiddleware, leadAccess, sheetSyncRouter);
app.use('/api/leads/institutes', authMiddleware, leadAccess, institutesRouter);
// Public: OpenWA calls this directly and cannot authenticate as one of our
// users. It's secured by the HMAC signature check inside the route itself.
// Mounted BEFORE the authenticated /api/leads/whatsapp route so Express
// resolves this more specific public path first.
app.use('/api/leads/whatsapp/webhook', whatsappWebhookRouter);
// Public (internal-secret guarded): other backend services send plain
// WhatsApp notifications through here. Mounted before the authenticated
// route below for the same reason as the webhook route above.
app.use('/api/leads/whatsapp/internal', whatsappInternalRouter);
app.use('/api/leads/whatsapp',   authMiddleware, leadAccess, whatsappRouter);
app.use('/api/leads',            authMiddleware, leadAccess, leadsRouter);

app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));
app.use((err, req, res, next) => {
  console.error('[server]', err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: err?.message || 'Internal server error' });
});

async function start() {
  try {
    await ensureSchema();
    app.listen(config.port, () => console.log(`✓ Lead Management Service running on port ${config.port}`));
  } catch (err) {
    console.error('✗ Failed to start:', err.message);
    process.exit(1);
  }
}

start();
