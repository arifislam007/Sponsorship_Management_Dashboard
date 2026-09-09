-- Admin user creation is handled by seedAdminUser() in backend/src/db.js, which generates
-- (or reads from ADMIN_INITIAL_PASSWORD) a real password instead of a hardcoded default hash.

-- Assign admin role (no-op if the admin user doesn't exist yet)
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r 
WHERE u.username = 'admin' AND r.name = 'admin' 
ON CONFLICT DO NOTHING;
