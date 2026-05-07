# Role-Based Access Control (RBAC) System

This document describes the User Privilege Module-Based Access Management system implemented in the Sponsorship Management Dashboard.

## Overview

The application now includes a comprehensive role-based access control system with three default roles:
- **Admin**: Full access to all modules and system configuration
- **Accountant**: Access to financial data, donors, and dashboard
- **Operator**: Limited access to data entry and viewing

Each role can be granted specific permissions on modules, and individual users can be granted module-level overrides.

## Database Schema

### Tables

#### users
Stores user credentials and information:
- `id`: Primary key
- `username`: Unique username
- `email`: Unique email address
- `password_hash`: Bcryptjs-hashed password
- `full_name`: User's full name
- `is_active`: Boolean flag to enable/disable accounts
- `created_at`, `updated_at`: Timestamps

#### roles
Defines available roles:
- `id`: Primary key
- `name`: Unique role name (admin, accountant, operator)
- `description`: Role description

#### modules
Defines application modules:
- `id`: Primary key
- `name`: Unique module name
- `description`: Module description
- `route_name`: Frontend route name

#### permissions
Junction table linking roles to modules with granular permissions:
- `role_id`: Foreign key to roles
- `module_id`: Foreign key to modules
- `can_view`: Boolean - can view module
- `can_create`: Boolean - can create data
- `can_edit`: Boolean - can edit data
- `can_delete`: Boolean - can delete data

#### user_roles
Links users to roles (many-to-many):
- `user_id`: Foreign key to users
- `role_id`: Foreign key to roles

#### user_module_access
User-specific module access overrides:
- `user_id`: Foreign key to users
- `module_id`: Foreign key to modules
- `can_view`, `can_create`, `can_edit`, `can_delete`: Permission flags
- `override_role_permissions`: Boolean - if true, overrides role-based permissions

## Backend Architecture

### Middleware

#### authMiddleware
Verifies JWT token and extracts user information from the Authorization header.

```javascript
app.use('/api/v1/protected-route', authMiddleware, handler);
```

#### roleMiddleware
Checks if user has any of the specified roles.

```javascript
app.use('/api/v1/admin-route', authMiddleware, roleMiddleware('admin'), handler);
```

#### moduleAccessMiddleware
Checks if user has access to a specific module (considers both role-based and user-specific overrides).

```javascript
app.use('/api/v1/donors', authMiddleware, moduleAccessMiddleware('Donors'), handler);
```

#### requirePermission
Checks if user has specific action permission (view, create, edit, delete).

```javascript
router.post('/create', authMiddleware, moduleAccessMiddleware('Students'), requirePermission('create'), handler);
```

### API Endpoints

#### Authentication Endpoints

**POST /api/v1/auth/login**
Authenticates user and returns JWT token.

Request:
```json
{
  "username": "admin",
  "password": "password"
}
```

Response:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "fullName": "Administrator",
    "roles": ["admin"]
  }
}
```

**POST /api/v1/auth/register** (Admin only)
Creates a new user.

Request:
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "securepassword",
  "fullName": "New User",
  "roles": ["operator"]
}
```

**GET /api/v1/auth/me**
Returns current user information.

**GET /api/v1/auth/permissions**
Returns user's module permissions.

Response:
```json
{
  "permissions": {
    "Dashboard": {
      "canView": true,
      "canCreate": false,
      "canEdit": false,
      "canDelete": false
    },
    "Donors": {
      "canView": true,
      "canCreate": true,
      "canEdit": true,
      "canDelete": false
    }
  }
}
```

#### Admin Endpoints

**GET /api/v1/admin/users**
List all users (with roles).

**GET /api/v1/admin/users/:userId**
Get specific user details with permissions.

**PUT /api/v1/admin/users/:userId/roles**
Update user roles.

Request:
```json
{
  "roleNames": ["accountant", "operator"]
}
```

**POST /api/v1/admin/users/:userId/module-access**
Set specific module access for user (override).

Request:
```json
{
  "moduleName": "Accounting",
  "canView": true,
  "canCreate": true,
  "canEdit": true,
  "canDelete": false,
  "overrideRolePermissions": true
}
```

**DELETE /api/v1/admin/users/:userId/module-access/:moduleName**
Remove specific module access override.

**PUT /api/v1/admin/users/:userId/status**
Toggle user active/inactive status.

**GET /api/v1/admin/roles**
List all available roles.

**GET /api/v1/admin/modules**
List all available modules.

**GET /api/v1/admin/roles/:roleName/permissions**
Get permissions for a specific role.

**PUT /api/v1/admin/roles/:roleName/permissions**
Update permissions for a role on a module.

## Frontend Architecture

### AuthContext
Provides authentication state and utility functions:

```typescript
const { user, token, permissions, isLoading, login, logout, hasRole, canAccess } = useAuth();
```

Methods:
- `login(username, password)`: Authenticates user
- `logout()`: Clears session
- `hasRole(role)`: Checks if user has a role
- `canAccess(module, action)`: Checks module permission

### ProtectedRoute Component
Wraps components to enforce authentication and authorization:

```typescript
<ProtectedRoute requiredModule="Donors" requiredAction="view">
  <Donors />
</ProtectedRoute>
```

### Login Component
Provides login UI at `/login` route.

## Default Permissions

### Admin Role
- Full access (view, create, edit, delete) to all modules

### Accountant Role
- **Dashboard**: View ✓
- **Donors**: View ✓, Create ✓, Edit ✓
- **Accounting**: View ✓, Create ✓, Edit ✓
- **Export**: View ✓

### Operator Role
- **Dashboard**: View ✓
- **Donors**: View ✓, Create ✓
- **Students**: View ✓, Create ✓
- **Sponsorships**: View ✓, Create ✓

## Environment Variables

Add to your `.env` file:

```bash
JWT_SECRET=your-secret-key-change-in-production
```

## Initial Setup

### 1. Install Dependencies

```bash
cd backend
npm install
cd ../
npm install
```

### 2. Run Database Migration

The auth schema is automatically applied when the backend starts:

```bash
npm run dev  # or npm run start
```

### 3. Create Initial Admin User

Use the admin registration endpoint or directly insert into the database:

```sql
INSERT INTO users (username, email, password_hash, full_name, is_active)
VALUES ('admin', 'admin@example.com', '$2a$10$...', 'Administrator', true);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'admin';
```

To generate a bcryptjs hash:
```bash
node -e "require('bcryptjs').hash('password', 10, (err, hash) => console.log(hash))"
```

## Usage Examples

### Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

### Create User (Admin only)
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username":"accountant1",
    "email":"acc@example.com",
    "password":"securepass",
    "fullName":"Accountant One",
    "roles":["accountant"]
  }'
```

### Check Permissions
```bash
curl -X GET http://localhost:8000/api/v1/auth/permissions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update User Roles
```bash
curl -X PUT http://localhost:8000/api/v1/admin/users/2/roles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roleNames":["operator"]}'
```

## Frontend Usage

### Conditional Rendering Based on Permissions

```typescript
import { useAuth } from '../contexts/AuthContext';

export function MyComponent() {
  const { canAccess, hasRole } = useAuth();

  return (
    <>
      {canAccess('Donors', 'create') && (
        <button>Create New Donor</button>
      )}

      {hasRole('admin') && (
        <AdminPanel />
      )}
    </>
  );
}
```

### Protecting Routes

```typescript
<ProtectedRoute requiredRole="admin">
  <AdminPanel />
</ProtectedRoute>

<ProtectedRoute requiredModule="Accounting" requiredAction="edit">
  <AccountingEditor />
</ProtectedRoute>
```

## Security Considerations

1. **JWT Secret**: Change `JWT_SECRET` in production
2. **Password Hashing**: Passwords are hashed with bcryptjs (10 salt rounds)
3. **Token Expiry**: Tokens expire after 24 hours
4. **HTTPS**: Always use HTTPS in production
5. **Admin Isolation**: Registration endpoint only works for admins
6. **Input Validation**: All inputs should be validated on both backend and frontend

## Troubleshooting

### User cannot login
- Verify user exists: `SELECT * FROM users WHERE username = 'admin';`
- Verify user is active: `is_active = true`
- Check password hash matches (use bcryptjs comparison)

### Missing module access
- Verify module exists: `SELECT * FROM modules WHERE name = 'Dashboard';`
- Verify role has permissions: `SELECT * FROM permissions WHERE role_id = X AND module_id = Y;`
- Check for user-specific overrides: `SELECT * FROM user_module_access WHERE user_id = X;`

### Token errors
- Verify token not expired (24 hour expiry)
- Verify Authorization header format: `Authorization: Bearer <token>`
- Check JWT_SECRET matches between requests

## Future Enhancements

1. Role templates for quick setup
2. Audit logs for permission changes
3. Multi-factor authentication
4. Token refresh mechanism
5. Role hierarchy/inheritance
6. Bulk permission management
7. Permission dependency resolution
