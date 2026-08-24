import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { ensureSchema } from './db.js';
import { authMiddleware, moduleAccessMiddleware } from './middleware/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { coursesRouter } from './routes/courses.js';
import { leadsRouter } from './routes/leads.js';
import { followupsRouter } from './routes/followups.js';
import { reportsRouter } from './routes/reports.js';

const app = express();
app.use(express.json({ limit: '10mb' }));
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
