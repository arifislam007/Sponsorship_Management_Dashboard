import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { pool } from '../db.js';

const JWT_SECRET = config.jwtSecret || 'your-secret-key-change-in-production';

export function generateToken(userId, username) {
  return jwt.sign(
    { userId, username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  req.user = decoded;
  next();
}

export function roleMiddleware(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    try {
      const result = await pool.query(
        `SELECT r.name FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = $1`,
        [req.user.userId]
      );

      const userRoles = result.rows.map(row => row.name);
      const hasRole = allowedRoles.some(role => userRoles.includes(role));

      if (!hasRole) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      req.userRoles = userRoles;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
}

export function moduleAccessMiddleware(moduleName) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    try {
      // Check if user has specific module access override
      const specificAccessResult = await pool.query(
        `SELECT uma.* FROM user_module_access uma
         JOIN modules m ON uma.module_id = m.id
         WHERE uma.user_id = $1 AND m.name = $2 AND uma.override_role_permissions = true`,
        [req.user.userId, moduleName]
      );

      if (specificAccessResult.rows.length > 0) {
        const access = specificAccessResult.rows[0];
        req.moduleAccess = access;
        return next();
      }

      // Check role-based permissions
      const rolePermResult = await pool.query(
        `SELECT p.* FROM permissions p
         JOIN user_roles ur ON p.role_id = ur.role_id
         JOIN modules m ON p.module_id = m.id
         WHERE ur.user_id = $1 AND m.name = $2`,
        [req.user.userId, moduleName]
      );

      if (rolePermResult.rows.length === 0) {
        return res.status(403).json({ message: 'Module access denied' });
      }

      req.moduleAccess = rolePermResult.rows[0];
      next();
    } catch (error) {
      console.error('Module access check error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
}

export function requirePermission(action) {
  return (req, res, next) => {
    if (!req.moduleAccess) {
      return res.status(403).json({ message: 'No module access' });
    }

    const permission = `can_${action}`;
    if (!req.moduleAccess[permission]) {
      return res.status(403).json({ message: `Permission denied for action: ${action}` });
    }

    next();
  };
}
