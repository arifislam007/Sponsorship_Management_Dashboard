-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(200) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Modules table (for granular access control)
CREATE TABLE IF NOT EXISTS modules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    route_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table (role + module = permissions)
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT FALSE,
    can_create BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    UNIQUE(role_id, module_id)
);

-- User roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE(user_id, role_id)
);

-- User module access (for specific user overrides)
CREATE TABLE IF NOT EXISTS user_module_access (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT FALSE,
    can_create BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    override_role_permissions BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, module_id)
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
    ('admin', 'Administrator with full access'),
    ('accountant', 'Accountant with access to accounting and donor data'),
    ('operator', 'Operator with limited access to data entry and viewing')
ON CONFLICT (name) DO NOTHING;

-- Insert modules
INSERT INTO modules (name, description, route_name) VALUES
    ('Dashboard', 'Dashboard overview', 'dashboard'),
    ('Donors', 'Donor management', 'donors'),
    ('Students', 'Student management', 'students'),
    ('Sponsorships', 'Sponsorship management', 'sponsorships'),
    ('Accounting', 'Accounting and ledger', 'accounting'),
    ('Export', 'Data export functionality', 'export'),
    ('Admin', 'Admin panel and user management', 'admin')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions for admin (full access to all modules)
INSERT INTO permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id, true, true, true, true
FROM roles r, modules m
WHERE r.name = 'admin'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Insert default permissions for accountant
INSERT INTO permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id, true, true, true, false
FROM roles r, modules m
WHERE r.name = 'accountant' AND m.name IN ('Dashboard', 'Donors', 'Accounting', 'Export')
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Insert default permissions for operator
INSERT INTO permissions (role_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT r.id, m.id, true, true, false, false
FROM roles r, modules m
WHERE r.name = 'operator' AND m.name IN ('Dashboard', 'Donors', 'Students', 'Sponsorships')
ON CONFLICT (role_id, module_id) DO NOTHING;
