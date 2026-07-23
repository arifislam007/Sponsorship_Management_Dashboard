import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { ensureSchema } from './db.js';
import { authMiddleware } from './middleware/auth.js';
import { projectsRouter } from './routes/projects.js';
import { tasksRouter } from './routes/tasks.js';
import { dashboardRouter } from './routes/dashboard.js';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'project-service', timestamp: new Date() });
});

// All project routes require JWT authentication
app.use('/api/projects/dashboard', authMiddleware, dashboardRouter);
app.use('/api/projects/tasks', authMiddleware, tasksRouter);
app.use('/api/projects', authMiddleware, projectsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('[server] Error:', err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: err?.message || 'Internal server error' });
});

async function start() {
  try {
    await ensureSchema();
    app.listen(config.port, () => {
      console.log(`✓ Project Service running on port ${config.port}`);
    });
  } catch (err) {
    console.error('✗ Failed to start:', err.message);
    process.exit(1);
  }
}

start();
