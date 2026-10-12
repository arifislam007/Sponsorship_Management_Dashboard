import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { ensureSchema } from './db.js';
import { authMiddleware, moduleAccessMiddleware } from './middleware/auth.js';
import { positionsRouter } from './routes/positions.js';
import { boardMembersRouter } from './routes/boardMembers.js';
import { membersRouter } from './routes/members.js';
import { meetingsRouter } from './routes/meetings.js';
import { constitutionRouter } from './routes/constitution.js';
import { approvalsRouter } from './routes/approvals.js';
import { portalAuthRouter } from './routes/portalAuth.js';

const app = express();
const PORT = config.port;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'NPO Backend is running', timestamp: new Date() });
});

// Member self-service portal is mounted FIRST and deliberately NOT behind
// the staff authMiddleware/npoAccess gate below. Express applies middleware
// passed to app.use(path, ...) to every request matching that path prefix,
// regardless of registration order of *later* app.use() calls on the same
// prefix — so if this were mounted after the staff-gated routers, requests
// to /api/npo/portal/* would already have been intercepted (and 401'd) by
// authMiddleware before ever reaching portalAuthRouter. Mounting it first
// means /portal/* is handled here; any other /api/npo/* path has no match
// in portalAuthRouter, so Express falls through to the routers below as
// normal. portalAuthRouter enforces its own separate token type
// (portalAuthMiddleware, per-route) and /portal/login is public by design.
app.use('/api/npo', portalAuthRouter);

const npoAccess = moduleAccessMiddleware('NPO');
app.use('/api/npo', authMiddleware, npoAccess, positionsRouter);
app.use('/api/npo', authMiddleware, npoAccess, boardMembersRouter);
app.use('/api/npo', authMiddleware, npoAccess, membersRouter);
app.use('/api/npo', authMiddleware, npoAccess, meetingsRouter);
app.use('/api/npo', authMiddleware, npoAccess, constitutionRouter);
app.use('/api/npo', authMiddleware, npoAccess, approvalsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

async function start() {
  try {
    await ensureSchema();
    app.listen(PORT, () => {
      console.log(`✓ NPO Backend running on port ${PORT}`);
      console.log(`✓ API Base URL: http://localhost:${PORT}/api/npo`);
    });
  } catch (err) {
    console.error('✗ Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
