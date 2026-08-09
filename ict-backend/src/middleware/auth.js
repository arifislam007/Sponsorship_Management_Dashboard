import jwt from 'jsonwebtoken';
import pool from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    try {
      const result = await pool.query(
        `SELECT r.name FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = $1`,
        [req.user.userId]
      );
      const userRoles = result.rows.map((row) => row.name);
      if (!allowedRoles.some((role) => userRoles.includes(role))) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      next();
    } catch (err) {
      console.error('[requireRole]', err.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
}

export function moduleAccessMiddleware(moduleName) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    try {
      const override = await pool.query(
        `SELECT uma.* FROM user_module_access uma
         JOIN modules m ON uma.module_id = m.id
         WHERE uma.user_id = $1 AND m.name = $2 AND uma.override_role_permissions = true`,
        [req.user.userId, moduleName]
      );
      if (override.rows.length > 0) { req.moduleAccess = override.rows[0]; return next(); }

      const perm = await pool.query(
        `SELECT p.* FROM permissions p
         JOIN user_roles ur ON p.role_id = ur.role_id
         JOIN modules m ON p.module_id = m.id
         WHERE ur.user_id = $1 AND m.name = $2`,
        [req.user.userId, moduleName]
      );
      if (perm.rows.length === 0) return res.status(403).json({ message: `Access to ${moduleName} denied` });
      req.moduleAccess = perm.rows[0];
      next();
    } catch (err) {
      console.error('[moduleAccess]', err.message);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
}
