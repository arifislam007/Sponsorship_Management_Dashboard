# Role-Based Access Control (RBAC) - Quick Start Guide

## What's New

The Sponsorship Management Dashboard now includes a complete **User Privilege Module-Based Access Management** system with:

- ✅ **3 Default Roles**: Admin, Accountant, Operator
- ✅ **Granular Permissions**: View, Create, Edit, Delete per module
- ✅ **User-Specific Access Overrides**: Allow specific users access to modules beyond their role
- ✅ **7 Protected Modules**: Dashboard, Donors, Students, Sponsorships, Accounting, Export, Admin
- ✅ **JWT-based Authentication**: Secure token-based session management
- ✅ **Admin Panel**: Full user and role management UI

## Quick Start

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../
npm install
```

### 2. Start the Application

```bash
# In project root - start both backend and frontend
docker compose up -d --build
# or
npm run dev  # if running locally
```

### 3. Login

The app will automatically run database migrations on first start. 

**Demo Credentials:**
- Username: `admin`
- Password: `password`

Or create new users from the **Admin Panel** (Settings tab).

## Default Role Permissions

### 👨‍💼 Admin
- Full access to all modules
- Can create, edit, delete users
- Can manage roles and permissions

### 💰 Accountant  
- View Dashboard
- Manage Donors (view, create, edit)
- Manage Accounting/Ledger (view, create, edit)
- Export reports

### 🔧 Operator
- View Dashboard
- Manage Students (view, create)
- Manage Donors (view, create)
- Manage Sponsorships (view, create)

## Key Features

### Frontend
- **Automatic Route Protection**: Routes require authentication and module access
- **Dynamic Navigation**: Menu items show/hide based on user permissions
- **Permission-Based UI**: Buttons and features disabled if user lacks permission
- **Session Management**: Auto-logout on token expiry, manual logout available

### Backend
- **JWT Authentication**: 24-hour token expiry
- **Role-Based Middleware**: Automatic permission checking on all protected routes
- **User-Specific Overrides**: Grant individual users module access outside their roles
- **Audit Trail Ready**: All user actions are traceable

## File Structure

### Backend Files Added
```
backend/
├── sql/
│   └── auth_schema.sql         # User, role, permission tables
├── src/
│   ├── middleware/
│   │   └── auth.js             # Auth & permission middleware
│   ├── routes/
│   │   ├── auth.js             # Login, register, permissions
│   │   └── admin.js            # User & role management
│   └── config.js               # Added JWT_SECRET
```

### Frontend Files Added
```
src/app/
├── contexts/
│   └── AuthContext.tsx         # Auth state management
├── components/
│   ├── Login.tsx               # Login page
│   ├── ProtectedRoute.tsx       # Route protection wrapper
│   ├── Admin.tsx               # Admin/Settings panel
│   └── RootLayout.tsx          # Updated with auth features
└── routes.tsx                  # Updated with Auth provider & protected routes
```

## API Endpoints

### Auth Endpoints
```
POST   /api/v1/auth/login                    # Login
POST   /api/v1/auth/register                 # Create user (admin only)
GET    /api/v1/auth/me                       # Get current user
GET    /api/v1/auth/permissions              # Get user permissions
```

### Admin Endpoints
```
GET    /api/v1/admin/users                   # List users
GET    /api/v1/admin/users/:id               # Get user details
PUT    /api/v1/admin/users/:id/roles         # Update user roles
POST   /api/v1/admin/users/:id/module-access # Grant module access
DELETE /api/v1/admin/users/:id/module-access/:module  # Revoke module access
PUT    /api/v1/admin/users/:id/status        # Activate/deactivate user

GET    /api/v1/admin/roles                   # List roles
GET    /api/v1/admin/modules                 # List modules
GET    /api/v1/admin/roles/:role/permissions # Get role permissions
PUT    /api/v1/admin/roles/:role/permissions # Update role permissions
```

### Protected Routes
All existing routes now require authentication:
```
GET/POST /api/v1/dashboard/*
GET/POST /api/v1/donors/*
GET/POST /api/v1/students/*
GET/POST /api/v1/sponsorships/*
GET/POST /api/v1/ledger/*
GET      /api/v1/exports/*
```

Add `Authorization: Bearer <token>` header to requests.

## Environment Variables

Add to your `.env` file:

```bash
# Backend (backend/.env)
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key-change-in-production
PORT=8000
API_PREFIX=/api/v1

# Frontend (.env)
VITE_API_URL=http://localhost:8000
```

## Usage Examples

### Login from Frontend
```typescript
import { useAuth } from './contexts/AuthContext';

function LoginPage() {
  const { login } = useAuth();
  
  const handleLogin = async (username, password) => {
    try {
      await login(username, password);
      // User is now authenticated
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
}
```

### Check Permissions
```typescript
const { canAccess, hasRole } = useAuth();

// Check module access
if (canAccess('Donors', 'create')) {
  // Show create donor button
}

// Check role
if (hasRole('admin')) {
  // Show admin features
}
```

### Protect Routes
```typescript
<ProtectedRoute requiredModule="Accounting" requiredAction="edit">
  <AccountingPage />
</ProtectedRoute>

<ProtectedRoute requiredRole="admin">
  <AdminPanel />
</ProtectedRoute>
```

## Database Schema

The system creates 6 new tables:
- `users` - User accounts
- `roles` - Role definitions (admin, accountant, operator)
- `modules` - Application modules
- `permissions` - Role→Module→Action mappings
- `user_roles` - User→Role mappings
- `user_module_access` - User-specific access overrides

All automatically created on first backend startup.

## Admin Panel Features

The Admin Panel (accessible only to admins) allows:

1. **User Management**
   - Create new users
   - Assign roles to users
   - Activate/deactivate accounts

2. **Role Management**
   - View all roles
   - View/modify role permissions per module
   - Manage who can view, create, edit, delete

3. **Module Management**
   - View all available modules
   - See module descriptions and routes

4. **User-Specific Access**
   - Grant individual users access to modules outside their roles
   - Override role-based permissions when needed

## Security Notes

1. **Change JWT_SECRET in production** - Default is a placeholder
2. **Use HTTPS** in production for all API calls
3. **Passwords** are hashed with bcryptjs (10 salt rounds)
4. **Tokens expire** after 24 hours - users must login again
5. **Role isolation** - Only admins can create users
6. **Input validation** - All backend inputs are validated

## Troubleshooting

### Can't Login
- Check if user exists in database
- Verify user account is active (`is_active = true`)
- Check password is correct (bcryptjs comparison)

### Getting "Module Access Denied"
- Verify user has the required role
- Check if module permissions are set for that role
- Look for user-specific access overrides in admin panel

### Routes Not Protected
- Ensure `AuthProvider` wraps your app
- Check `ProtectedRoute` is correctly configured
- Verify token is being sent in Authorization header

### Token Errors
- Tokens expire after 24 hours - login again
- Ensure header format is `Authorization: Bearer <token>`
- Check JWT_SECRET matches between backend and subsequent requests

## Next Steps

1. **Create User Accounts** - Use Admin Panel or API
2. **Assign Roles** - Give users appropriate roles
3. **Test Access** - Verify users can/cannot access modules
4. **Customize Permissions** - Adjust role permissions as needed
5. **Set User Overrides** - Grant specific users special module access

## Support

For detailed technical documentation, see `RBAC_DOCUMENTATION.md`

---

**System Ready!** 🎉 Your dashboard now has enterprise-grade access control.
