# Admin User Protection Documentation

## Overview
The admin user and admin role are now protected from accidental deletion and privilege removal. Only password changes are allowed for admin users.

## Protection Rules

### 1. **Admin User Deletion Prevention**
- **Rule**: Users with the `admin` role cannot be deleted
- **Response**: HTTP 403 (Forbidden) with message: "Cannot delete admin user. Admin users are protected and cannot be removed."
- **Endpoint**: `DELETE /api/v1/admin/users/:userId`
- **Location**: [backend/src/routes/admin.js](backend/src/routes/admin.js#L199-L230)

### 2. **Admin Role Removal Prevention**
- **Rule**: The `admin` role cannot be removed from a user who has it
- **Response**: HTTP 403 (Forbidden) with message: "Cannot remove admin role. Admin user privileges are protected."
- **Endpoint**: `PUT /api/v1/admin/users/:userId/roles`
- **Location**: [backend/src/routes/admin.js](backend/src/routes/admin.js#L75-L113)

### 3. **Admin User Deactivation Prevention**
- **Rule**: Users with the `admin` role cannot be deactivated (set to inactive)
- **Response**: HTTP 403 (Forbidden) with message: "Cannot deactivate admin user. Admin users must remain active."
- **Endpoint**: `PUT /api/v1/admin/users/:userId/status`
- **Location**: [backend/src/routes/admin.js](backend/src/routes/admin.js#L302-L337)

### 4. **Admin Password Change Allowed**
- **Rule**: Only the admin password can be edited (allowed operation)
- **Endpoint**: `PUT /api/v1/admin/users/:userId/password`
- **Requirements**: Password must be at least 6 characters long

## Frontend UI Changes

### Admin Panel Updates
1. **Delete Button**: Disabled for admin users with tooltip "Admin users cannot be deleted"
2. **Deactivate Button**: Disabled for admin users with tooltip "Cannot deactivate admin user"
3. **Leave Only Button**: Disabled for admin users with tooltip "Cannot modify admin user"
4. **Role Checkboxes**: Admin checkbox is disabled for admin users with visual indication
5. **Admin Badge**: Badge displayed on admin user edit modal showing "ADMIN" status
6. **Admin Protection Alert**: Warning message shown in role section explaining admin cannot be modified

### UI Locations
- [src/app/components/Admin.tsx](src/app/components/Admin.tsx) - All UI protections implemented

## Database Implementation

### Backend Checks
All protections are implemented with:
1. SQL queries to detect if user has `admin` role
2. Conditional checks before performing operations
3. Appropriate HTTP status codes (403 Forbidden)
4. User-friendly error messages

### No Database Changes Required
- No schema modifications needed
- Existing `users`, `user_roles`, and `roles` tables work as-is
- Protection logic is application-level in the backend

## Testing Checklist

- [ ] Try to delete an admin user → should be blocked with error message
- [ ] Try to remove admin role from admin user → should be blocked with error message
- [ ] Try to deactivate an admin user → should be blocked with error message
- [ ] Reset admin user password → should work normally
- [ ] Edit admin user profile (username, email, name) → should work normally
- [ ] UI buttons should be disabled with proper visual feedback for admin users
- [ ] Non-admin users should have full deletion/role management capabilities

## Implementation Details

### Backend Code Pattern
```javascript
// Check if user has admin role
const userRolesResult = await pool.query(
  `SELECT r.name FROM user_roles ur
   JOIN roles r ON ur.role_id = r.id
   WHERE ur.user_id = $1`,
  [userId]
);

const hasAdminRole = userRolesResult.rows.some(role => role.name === 'admin');

// Protect operation
if (hasAdminRole) {
  return res.status(403).json({ message: 'Protection message' });
}
```

### Frontend Pattern
```tsx
// Disable buttons for admin users
disabled={user.roles?.some((r) => r?.name === 'admin')}
title="Admin users cannot be deleted"

// Visual indicators
{selectedUser?.roles.some((r) => r?.name === 'admin') && (
  <span className="admin-badge">ADMIN</span>
)}
```

## Future Considerations

1. **Audit Logging**: Consider adding audit logs for attempted modifications to admin users
2. **Two-Factor Authentication**: Could add extra verification for admin password changes
3. **Multiple Admins**: System can support multiple admin users; all protections apply equally
4. **Admin Restoration**: If needed, only database direct manipulation or system recovery could modify protected admin

## Security Notes

- Admin user is essential for system operation and must never be deleted
- Admin role is the highest privilege level and cannot be downgraded
- Password change is the only administrative operation allowed on admin users
- All protections are enforced both at backend API level and frontend UI level
- Error messages are user-friendly but don't expose sensitive system information

