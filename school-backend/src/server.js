import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { ensureSchema } from './db.js';
import { authMiddleware } from './middleware/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { classesRouter } from './routes/classes.js';
import { studentsRouter } from './routes/students.js';
import { attendanceRouter } from './routes/attendance.js';
import { monitoringRouter } from './routes/monitoring.js';
import { classAttendanceRouter } from './routes/classAttendance.js';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', service: 'school-service', timestamp: new Date() })
);

app.use('/api/school/dashboard',   authMiddleware, dashboardRouter);
app.use('/api/school/classes',     authMiddleware, classesRouter);
app.use('/api/school/students',    authMiddleware, studentsRouter);
app.use('/api/school/attendance',  authMiddleware, attendanceRouter);
app.use('/api/school/monitoring',  authMiddleware, monitoringRouter);
app.use('/api/school/class-attendance', authMiddleware, classAttendanceRouter);

app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));
app.use((err, req, res, next) => {
  console.error('[server]', err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: err?.message || 'Internal server error' });
});

async function start() {
  try {
    await ensureSchema();
    app.listen(config.port, () => console.log(`✓ School Service running on port ${config.port}`));
  } catch (err) {
    console.error('✗ Failed to start:', err.message);
    process.exit(1);
  }
}

start();
