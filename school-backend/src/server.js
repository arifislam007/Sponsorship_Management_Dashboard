import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { ensureSchema } from './db.js';
import { authMiddleware, moduleAccessMiddleware } from './middleware/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { classesRouter } from './routes/classes.js';
import { studentsRouter } from './routes/students.js';
import { attendanceRouter } from './routes/attendance.js';
import { monitoringRouter } from './routes/monitoring.js';
import { classAttendanceRouter } from './routes/classAttendance.js';
import { subjectsRouter } from './routes/subjects.js';
import { classroomsRouter } from './routes/classrooms.js';
import { routineRouter } from './routes/routine.js';
import { routineApprovalsRouter } from './routes/routineApprovals.js';
import { teachersRouter } from './routes/teachers.js';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', service: 'school-service', timestamp: new Date() })
);

const schoolAccess = moduleAccessMiddleware('School');
app.use('/api/school/dashboard',        authMiddleware, schoolAccess, dashboardRouter);
app.use('/api/school/classes',          authMiddleware, schoolAccess, classesRouter);
app.use('/api/school/students',         authMiddleware, schoolAccess, studentsRouter);
app.use('/api/school/attendance',       authMiddleware, schoolAccess, attendanceRouter);
app.use('/api/school/monitoring',       authMiddleware, schoolAccess, monitoringRouter);
app.use('/api/school/class-attendance', authMiddleware, schoolAccess, classAttendanceRouter);
app.use('/api/school/subjects',         authMiddleware, schoolAccess, subjectsRouter);
app.use('/api/school/classrooms',       authMiddleware, schoolAccess, classroomsRouter);
app.use('/api/school/routine',          authMiddleware, schoolAccess, routineRouter);
app.use('/api/school/routine-approvals', authMiddleware, schoolAccess, routineApprovalsRouter);
app.use('/api/school/teachers',         authMiddleware, schoolAccess, teachersRouter);

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
