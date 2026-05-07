import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { ensureSchema, pool } from './db.js';
import { dashboardRouter } from './routes/dashboard.js';
import { listStudents, studentsRouter } from './routes/students.js';
import { ledgerRouter } from './routes/ledger.js';
import { exportsRouter } from './routes/exports.js';
import { donorsRouter } from './routes/donors.js';
import { sponsorshipsRouter } from './routes/sponsorships.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { authMiddleware, moduleAccessMiddleware, requirePermission } from './middleware/auth.js';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(
  cors({
    origin: config.allowedOrigins.length ? config.allowedOrigins : true,
    credentials: true,
  })
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes (no protection)
app.use(`${config.apiPrefix}/auth`, authRouter);

// Public student listing for the home page
app.get(`${config.apiPrefix}/students`, listStudents);

// Admin routes
app.use(`${config.apiPrefix}/admin`, adminRouter);

// Protected routes with auth middleware
app.use(`${config.apiPrefix}/dashboard`, authMiddleware, moduleAccessMiddleware('Dashboard'), dashboardRouter);
app.use(`${config.apiPrefix}/students`, authMiddleware, moduleAccessMiddleware('Students'), studentsRouter);
app.use(`${config.apiPrefix}/donors`, authMiddleware, moduleAccessMiddleware('Donors'), donorsRouter);
app.use(`${config.apiPrefix}/sponsorships`, authMiddleware, moduleAccessMiddleware('Sponsorships'), sponsorshipsRouter);
app.use(`${config.apiPrefix}/ledger`, authMiddleware, moduleAccessMiddleware('Accounting'), ledgerRouter);
app.use(`${config.apiPrefix}/exports`, authMiddleware, moduleAccessMiddleware('Export'), exportsRouter);

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error(err);
  return res.status(500).json({
    message: err?.message || 'Internal server error',
  });
});

async function start() {
  await ensureSchema();

  app.listen(config.port, () => {
    console.log(`Backend running on port ${config.port}`);
  });
}

start().catch(async (error) => {
  console.error('Failed to start backend:', error);
  await pool.end().catch(() => null);
  process.exit(1);
});
