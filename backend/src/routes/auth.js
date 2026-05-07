import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { generateToken, authMiddleware, roleMiddleware } from '../middleware/auth.js';

export const authRouter = express.Router();

// Register new user (admin only)
authRouter.post('/register', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { username, email, password, fullName, roles: roleNames } = req.body;

  if (!username || !email || !password || !fullName) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await pool.query(
      'INSERT INTO users (username, email, password_hash, full_name) VALUES ($1, $2, $3, $4) RETURNING id, username, email, full_name',
      [username, email, passwordHash, fullName]
    );

    const userId = userResult.rows[0].id;

    // Assign roles
    if (roleNames && roleNames.length > 0) {
      for (const roleName of roleNames) {
        const roleResult = await pool.query(
          'SELECT id FROM roles WHERE name = $1',
          [roleName]
        );

        if (roleResult.rows.length > 0) {
          await pool.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [userId, roleResult.rows[0].id]
          );
        }
      }
    }

    res.status(201).json({
      message: 'User created successfully',
      user: userResult.rows[0]
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login
authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  try {
    const userResult = await pool.query(
      'SELECT id, username, email, password_hash, full_name FROM users WHERE username = $1 AND is_active = true',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Get user roles
    const rolesResult = await pool.query(
      `SELECT r.name FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [user.id]
    );

    const roles = rolesResult.rows.map(row => row.name);

    // Generate token
    const token = generateToken(user.id, user.username);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        roles
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// Get current user info
authRouter.get('/me', authMiddleware, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, username, email, full_name FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get user roles
    const rolesResult = await pool.query(
      `SELECT r.name FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [user.id]
    );

    const roles = rolesResult.rows.map(row => row.name);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        roles
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user info' });
  }
});

// Get user permissions for all modules
authRouter.get('/permissions', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.name, p.can_view, p.can_create, p.can_edit, p.can_delete
       FROM permissions p
       JOIN modules m ON p.module_id = m.id
       JOIN user_roles ur ON p.role_id = ur.role_id
       WHERE ur.user_id = $1
       UNION
       SELECT m.name, uma.can_view, uma.can_create, uma.can_edit, uma.can_delete
       FROM user_module_access uma
       JOIN modules m ON uma.module_id = m.id
       WHERE uma.user_id = $1 AND uma.override_role_permissions = true`,
      [req.user.userId]
    );

    const permissions = {};
    result.rows.forEach(row => {
      permissions[row.name] = {
        canView: row.can_view,
        canCreate: row.can_create,
        canEdit: row.can_edit,
        canDelete: row.can_delete
      };
    });

    res.json({ permissions });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ message: 'Failed to get permissions' });
  }
});
