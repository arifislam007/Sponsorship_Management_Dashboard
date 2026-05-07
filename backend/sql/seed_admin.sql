-- Seed admin user
INSERT INTO users (username, email, password_hash, full_name, is_active) 
VALUES ('admin', 'admin@example.com', '$2a$10$gdZvJlvW73kBiQ9lcXrM4eZ5Qsv3jYhcgdrk8sqMjoxY3UBqndXn.', 'Administrator', true) 
ON CONFLICT (username) DO NOTHING;

-- Assign admin role
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id FROM users u, roles r 
WHERE u.username = 'admin' AND r.name = 'admin' 
ON CONFLICT DO NOTHING;
