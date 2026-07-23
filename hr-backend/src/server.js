import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { ensureSchema } from './db.js';
import { authMiddleware } from './middleware/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { departmentsRouter } from './routes/departments.js';
import { employeesRouter } from './routes/employees.js';
import { payrollRouter } from './routes/payroll.js';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', service: 'hr-service', timestamp: new Date() })
);

// All routes require JWT
app.use('/api/hr/dashboard',    authMiddleware, dashboardRouter);
app.use('/api/hr/departments',  authMiddleware, departmentsRouter);
app.use('/api/hr/employees',    authMiddleware, employeesRouter);
app.use('/api/hr/payroll',      authMiddleware, payrollRouter);

app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));
app.use((err, req, res, next) => {
  console.error('[server]', err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: err?.message || 'Internal server error' });
});

async function start() {
  try {
    await ensureSchema();
    app.listen(config.port, () => console.log(`✓ HR Service running on port ${config.port}`));
  } catch (err) {
    console.error('✗ Failed to start:', err.message);
    process.exit(1);
  }
}

start();
