import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const JWT_SECRET = config.jwtSecret;

// Deliberately separate from the staff authMiddleware's token shape
// ({userId, username}) — a portal token must never be accepted by the
// staff-only NPO admin routes, and a staff token must never be accepted
// here. Checking `type === 'npo_portal'` is what enforces that boundary.
export function portalAuthMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== 'npo_portal') return res.status(401).json({ message: 'Invalid token' });
    req.portalVoter = { voterType: payload.voterType, voterId: payload.voterId };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function signPortalToken(voterType, voterId) {
  return jwt.sign({ type: 'npo_portal', voterType, voterId }, JWT_SECRET, { expiresIn: '7d' });
}
