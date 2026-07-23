-- Project Management Service Schema
-- All tables are prefixed with pm_ to avoid collisions

CREATE TABLE IF NOT EXISTS pm_projects (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Administration',
    description TEXT,
    project_manager_id INTEGER,
    project_manager_name VARCHAR(150),
    start_date DATE,
    end_date DATE,
    budget NUMERIC(14, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'Planning'
        CHECK (status IN ('Planning', 'Active', 'On Hold', 'Completed', 'Archived')),
    progress INTEGER NOT NULL DEFAULT 0
        CHECK (progress BETWEEN 0 AND 100),
    created_by INTEGER,
    created_by_name VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    user_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_member UNIQUE (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS pm_tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    parent_task_id INTEGER REFERENCES pm_tasks(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    assigned_user_id INTEGER,
    assigned_user_name VARCHAR(150),
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium'
        CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    due_date DATE,
    estimated_hours NUMERIC(6, 1),
    status VARCHAR(20) NOT NULL DEFAULT 'To Do'
        CHECK (status IN ('To Do', 'In Progress', 'Review', 'Completed')),
    progress INTEGER NOT NULL DEFAULT 0
        CHECK (progress BETWEEN 0 AND 100),
    created_by INTEGER,
    created_by_name VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_task_comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    user_name VARCHAR(150) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES pm_tasks(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    file_data TEXT,
    uploaded_by INTEGER,
    uploaded_by_name VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_project_documents (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES pm_projects(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    file_data TEXT,
    uploaded_by INTEGER,
    uploaded_by_name VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_activity_logs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES pm_projects(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES pm_tasks(id) ON DELETE SET NULL,
    user_id INTEGER,
    user_name VARCHAR(150),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_pm_tasks_project ON pm_tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_assigned ON pm_tasks (assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_status ON pm_tasks (status);
CREATE INDEX IF NOT EXISTS idx_pm_tasks_due ON pm_tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_pm_activity_project ON pm_activity_logs (project_id);
CREATE INDEX IF NOT EXISTS idx_pm_activity_created ON pm_activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pm_members_project ON pm_project_members (project_id);
CREATE INDEX IF NOT EXISTS idx_pm_comments_task ON pm_task_comments (task_id);
