import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { authMiddleware, roleMiddleware, requirePermission } from '../middleware/auth.js';

export const adminRouter = express.Router();

// List all users (admin only)
adminRouter.get('/users', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.is_active, u.created_at,
              COALESCE(
                json_agg(json_build_object('id', r.id, 'name', r.name)) FILTER (WHERE r.id IS NOT NULL),
                '[]'::json
              ) as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );

    res.json({ users: result.rows });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Failed to list users' });
  }
});

// Get user details with permissions
adminRouter.get('/users/:userId', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { userId } = req.params;

  try {
    const userResult = await pool.query(
      'SELECT id, username, email, full_name, is_active FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get user roles
    const rolesResult = await pool.query(
      `SELECT r.id, r.name FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1`,
      [userId]
    );

    // Get user-specific module access
    const moduleAccessResult = await pool.query(
      `SELECT uma.module_id, m.name, uma.can_view, uma.can_create, uma.can_edit, uma.can_delete
       FROM user_module_access uma
       JOIN modules m ON uma.module_id = m.id
       WHERE uma.user_id = $1`,
      [userId]
    );

    res.json({
      user: {
        ...user,
        roles: rolesResult.rows,
        moduleAccess: moduleAccessResult.rows
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user' });
  }
});

// Update user roles
adminRouter.put('/users/:userId/roles', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { userId } = req.params;
  const { roleNames } = req.body;

  if (!roleNames || !Array.isArray(roleNames)) {
    return res.status(400).json({ message: 'roleNames array required' });
  }

  try {
    // Protect only the original admin user by username
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length > 0 && userResult.rows[0].username === 'admin') {
      // Protect admin user - cannot remove admin role
      if (!roleNames.includes('admin')) {
        return res.status(403).json({ message: 'Cannot remove admin role. Admin user privileges are protected.' });
      }
    }

    // Remove existing roles
    await pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);

    // Add new roles
    for (const roleName of roleNames) {
      const roleResult = await pool.query(
        'SELECT id FROM roles WHERE name = $1',
        [roleName]
      );

      if (roleResult.rows.length > 0) {
        await pool.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
          [userId, roleResult.rows[0].id]
        );
      }
    }

    res.json({ message: 'User roles updated successfully' });
  } catch (error) {
    console.error('Update user roles error:', error);
    res.status(500).json({ message: 'Failed to update user roles' });
  }
});

// Update user profile fields
adminRouter.put('/users/:userId', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { userId } = req.params;
  const { username, email, fullName } = req.body;

  if (!username || !email || !fullName) {
    return res.status(400).json({ message: 'username, email and fullName are required' });
  }

  try {
    const existingUser = await pool.query(
      `SELECT id FROM users
       WHERE (username = $1 OR email = $2) AND id <> $3`,
      [username, email, userId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const result = await pool.query(
      `UPDATE users
       SET username = $1,
           email = $2,
           full_name = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, username, email, full_name, is_active, created_at`,
      [username, email, fullName, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Reset user password
adminRouter.put('/users/:userId/password', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { userId } = req.params;
  const { password } = req.body;

  if (!password || String(password).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const passwordHash = await bcrypt.hash(String(password), 10);
    const result = await pool.query(
      `UPDATE users
       SET password_hash = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id`,
      [passwordHash, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset user password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// Delete user
adminRouter.delete('/users/:userId', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { userId } = req.params;

  try {
    if (Number(userId) === req.user.userId) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    // Protect only the original admin user by username
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length > 0 && userResult.rows[0].username === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin user. The admin user is protected and cannot be removed.' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Set specific module access for user
adminRouter.post('/users/:userId/module-access', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { userId } = req.params;
  const { moduleName, canView, canCreate, canEdit, canDelete, overrideRolePermissions } = req.body;

  if (!moduleName) {
    return res.status(400).json({ message: 'moduleName required' });
  }

  try {
    // Get module id
    const moduleResult = await pool.query(
      'SELECT id FROM modules WHERE name = $1',
      [moduleName]
    );

    if (moduleResult.rows.length === 0) {
      return res.status(404).json({ message: 'Module not found' });
    }

    const moduleId = moduleResult.rows[0].id;

    // Upsert user_module_access
    await pool.query(
      `INSERT INTO user_module_access (user_id, module_id, can_view, can_create, can_edit, can_delete, override_role_permissions)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, module_id) DO UPDATE SET
       can_view = $3, can_create = $4, can_edit = $5, can_delete = $6, override_role_permissions = $7`,
      [userId, moduleId, canView || false, canCreate || false, canEdit || false, canDelete || false, overrideRolePermissions || false]
    );

    res.json({ message: 'Module access updated successfully' });
  } catch (error) {
    console.error('Set module access error:', error);
    res.status(500).json({ message: 'Failed to set module access' });
  }
});

// Remove specific module access for user
adminRouter.delete('/users/:userId/module-access/:moduleName', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { userId, moduleName } = req.params;

  try {
    const moduleResult = await pool.query(
      'SELECT id FROM modules WHERE name = $1',
      [moduleName]
    );

    if (moduleResult.rows.length === 0) {
      return res.status(404).json({ message: 'Module not found' });
    }

    await pool.query(
      'DELETE FROM user_module_access WHERE user_id = $1 AND module_id = $2',
      [userId, moduleResult.rows[0].id]
    );

    res.json({ message: 'Module access removed' });
  } catch (error) {
    console.error('Remove module access error:', error);
    res.status(500).json({ message: 'Failed to remove module access' });
  }
});

// Toggle user active status
adminRouter.put('/users/:userId/status', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { userId } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ message: 'isActive boolean required' });
  }

  try {
    // Protect only the original admin user by username
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length > 0 && userResult.rows[0].username === 'admin' && !isActive) {
      return res.status(403).json({ message: 'Cannot deactivate admin user. The admin user must remain active.' });
    }

    await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2',
      [isActive, userId]
    );

    res.json({ message: 'User status updated' });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Failed to update user status' });
  }
});

// List all roles
adminRouter.get('/roles', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, description FROM roles ORDER BY name');
    res.json({ roles: result.rows });
  } catch (error) {
    console.error('List roles error:', error);
    res.status(500).json({ message: 'Failed to list roles' });
  }
});

// List all modules
adminRouter.get('/modules', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, description, route_name FROM modules ORDER BY name');
    res.json({ modules: result.rows });
  } catch (error) {
    console.error('List modules error:', error);
    res.status(500).json({ message: 'Failed to list modules' });
  }
});

// Get role permissions
adminRouter.get('/roles/:roleName/permissions', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { roleName } = req.params;

  try {
    const result = await pool.query(
      `SELECT m.id, m.name, p.can_view, p.can_create, p.can_edit, p.can_delete
       FROM permissions p
       JOIN modules m ON p.module_id = m.id
       JOIN roles r ON p.role_id = r.id
       WHERE r.name = $1
       ORDER BY m.name`,
      [roleName]
    );

    res.json({ permissions: result.rows });
  } catch (error) {
    console.error('Get role permissions error:', error);
    res.status(500).json({ message: 'Failed to get role permissions' });
  }
});

// Update role permissions
adminRouter.put('/roles/:roleName/permissions', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  const { roleName } = req.params;
  const { moduleName, canView, canCreate, canEdit, canDelete } = req.body;

  if (!moduleName) {
    return res.status(400).json({ message: 'moduleName required' });
  }

  try {
    // Get role and module IDs
    const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [roleName]);
    const moduleResult = await pool.query('SELECT id FROM modules WHERE name = $1', [moduleName]);

    if (roleResult.rows.length === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }

    if (moduleResult.rows.length === 0) {
      return res.status(404).json({ message: 'Module not found' });
    }

    const roleId = roleResult.rows[0].id;
    const moduleId = moduleResult.rows[0].id;

    // Update permissions
    await pool.query(
      `UPDATE permissions
       SET can_view = $1, can_create = $2, can_edit = $3, can_delete = $4
       WHERE role_id = $5 AND module_id = $6`,
      [canView || false, canCreate || false, canEdit || false, canDelete || false, roleId, moduleId]
    );

    res.json({ message: 'Role permissions updated' });
  } catch (error) {
    console.error('Update role permissions error:', error);
    res.status(500).json({ message: 'Failed to update role permissions' });
  }
});
