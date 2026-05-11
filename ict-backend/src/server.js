import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ensureSchema } from './db.js';
import studentsRouter from './routes/students.js';
import admissionsRouter from './routes/admissions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ICT Backend is running', timestamp: new Date() });
});

// Routes
app.use('/api/ict', studentsRouter);
app.use('/api/ict', admissionsRouter);

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
      console.log(`✓ ICT Backend running on port ${PORT}`);
      console.log(`✓ API Base URL: http://localhost:${PORT}/api/ict`);
    });
  } catch (err) {
    console.error('✗ Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
