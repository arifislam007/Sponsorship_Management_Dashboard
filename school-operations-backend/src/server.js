import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ensureSchema } from './db.js';
import classRoutinesRouter from './routes/classRoutines.js';
import teachersRouter from './routes/teachers.js';
import curriculumRouter from './routes/curriculum.js';
import attendanceRouter from './routes/attendance.js';
import examsRouter from './routes/exams.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'School Operations Backend is running', timestamp: new Date() });
});

// Routes
app.use('/api/school-operations', classRoutinesRouter);
app.use('/api/school-operations', teachersRouter);
app.use('/api/school-operations', curriculumRouter);
app.use('/api/school-operations', attendanceRouter);
app.use('/api/school-operations', examsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Initialize schema and start server
async function start() {
  try {
    await ensureSchema();
    app.listen(PORT, () => {
      console.log(`✓ School Operations Backend running on port ${PORT}`);
      console.log(`✓ API Base URL: http://localhost:${PORT}/api/school-operations`);
    });
  } catch (err) {
    console.error('✗ Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
