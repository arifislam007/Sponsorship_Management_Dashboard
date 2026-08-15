-- HR Module Schema (hr_ prefix)
-- Tables for Employee Management and Salary/Payroll Management

CREATE TABLE IF NOT EXISTS hr_departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE,
  head_name VARCHAR(150),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_designations (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  department_id INTEGER REFERENCES hr_departments(id) ON DELETE SET NULL,
  grade VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_employees (
  id SERIAL PRIMARY KEY,
  employee_code VARCHAR(30) NOT NULL UNIQUE,

  -- Personal
  full_name VARCHAR(200) NOT NULL,
  photo TEXT,
  gender VARCHAR(10),
  date_of_birth DATE,
  blood_group VARCHAR(5),
  national_id VARCHAR(50),
  passport_number VARCHAR(30),
  mobile VARCHAR(20),
  email VARCHAR(150),
  present_address TEXT,
  permanent_address TEXT,
  emergency_contact_name VARCHAR(150),
  emergency_contact_number VARCHAR(20),
  emergency_contact_relation VARCHAR(50),

  -- Employment
  employee_type VARCHAR(20) NOT NULL DEFAULT 'Permanent',
  department_id INTEGER REFERENCES hr_departments(id) ON DELETE SET NULL,
  designation_id INTEGER REFERENCES hr_designations(id) ON DELETE SET NULL,
  reporting_manager_id INTEGER REFERENCES hr_employees(id) ON DELETE SET NULL,
  joining_date DATE,
  confirmation_date DATE,
  employment_status VARCHAR(20) NOT NULL DEFAULT 'Probation',
  office_location VARCHAR(150),
  work_email VARCHAR(150),
  employee_category VARCHAR(50),

  -- Financial
  basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  salary_grade VARCHAR(20),
  payment_method VARCHAR(20) DEFAULT 'Bank',
  bank_name VARCHAR(100),
  bank_branch VARCHAR(100),
  account_number VARCHAR(50),
  routing_number VARCHAR(50),
  mobile_wallet_number VARCHAR(20),
  tax_id VARCHAR(50),

  -- Meta
  linked_user_id INTEGER,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_employee_documents (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  document_type VARCHAR(60) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_data TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by_name VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_salary_components (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  component_type VARCHAR(20) NOT NULL CHECK (component_type IN ('Earning','Deduction')),
  is_taxable BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_payrolls (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES hr_employees(id),
  payroll_month VARCHAR(7) NOT NULL,
  basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_allowance NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'Draft',
  payment_date DATE,
  payment_method VARCHAR(20),
  payment_reference VARCHAR(100),
  notes TEXT,
  approved_by_name VARCHAR(150),
  approved_at TIMESTAMP,
  created_by_name VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_employee_payroll_month UNIQUE (employee_id, payroll_month)
);

CREATE TABLE IF NOT EXISTS hr_payroll_items (
  id SERIAL PRIMARY KEY,
  payroll_id INTEGER NOT NULL REFERENCES hr_payrolls(id) ON DELETE CASCADE,
  component_name VARCHAR(100) NOT NULL,
  component_type VARCHAR(20) NOT NULL CHECK (component_type IN ('Earning','Deduction')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- ── Attendance ────────────────────────────────────────────────────────────────

-- Drop old structure if it still has the session_number column (migration guard)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hr_attendance' AND column_name = 'session_number'
  ) THEN
    DROP TABLE IF EXISTS hr_attendance CASCADE;
  END IF;
END $$;

-- One row per employee per day; sessions accumulate into working_minutes
CREATE TABLE IF NOT EXISTS hr_attendance (
  id               SERIAL PRIMARY KEY,
  employee_id      INTEGER NOT NULL REFERENCES hr_employees(id) ON DELETE CASCADE,
  user_id          INTEGER NOT NULL,
  date             DATE NOT NULL,
  login_time       TIMESTAMPTZ NOT NULL,   -- first login of the day
  current_login    TIMESTAMPTZ,            -- start of current/last session
  logout_time      TIMESTAMPTZ,            -- last logout of the day
  login_ip         VARCHAR(45),            -- IP at first login
  logout_ip        VARCHAR(45),            -- IP at last logout
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  working_minutes  INTEGER  NOT NULL DEFAULT 0,  -- cumulative completed minutes
  session_count    INTEGER  NOT NULL DEFAULT 1,
  status           VARCHAR(20) NOT NULL DEFAULT 'Incomplete',
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_hr_attendance_daily UNIQUE (employee_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hr_emp_status     ON hr_employees(employment_status) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_hr_emp_dept        ON hr_employees(department_id)     WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_hr_emp_code        ON hr_employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_month   ON hr_payrolls(payroll_month);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_emp     ON hr_payrolls(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_status  ON hr_payrolls(payment_status);
CREATE INDEX IF NOT EXISTS idx_hr_att_date        ON hr_attendance(date);
CREATE INDEX IF NOT EXISTS idx_hr_att_emp_date    ON hr_attendance(employee_id, date);

-- Seed departments
INSERT INTO hr_departments (name, code) VALUES
  ('Administration', 'ADMIN'),
  ('Finance & Accounts', 'FINANCE'),
  ('Programs', 'PROGRAMS'),
  ('ICT', 'ICT'),
  ('Human Resources', 'HR'),
  ('Operations', 'OPS'),
  ('Field & Outreach', 'FIELD')
ON CONFLICT DO NOTHING;

-- Seed designations (cross-department, ordered by seniority)
INSERT INTO hr_designations (title, grade) VALUES
  ('Managing Director',  'G-1'),
  ('Executive Director', 'G-1'),
  ('General Manager',    'G-2'),
  ('Assistant Manager',  'G-3'),
  ('Senior Executive',   'G-3'),
  ('Executive',          'G-4'),
  ('Officer',            'G-4'),
  ('Junior Officer',     'G-5'),
  ('Office Assistant',   'G-5'),
  ('Staff',              'G-6')
ON CONFLICT DO NOTHING;

-- Seed salary components
INSERT INTO hr_salary_components (name, component_type, is_default) VALUES
  ('Basic Salary',          'Earning',   true),
  ('House Rent Allowance',  'Earning',   true),
  ('Medical Allowance',     'Earning',   true),
  ('Transport Allowance',   'Earning',   false),
  ('Mobile Allowance',      'Earning',   false),
  ('Food Allowance',        'Earning',   false),
  ('Festival Bonus',        'Earning',   false),
  ('Other Allowance',       'Earning',   false),
  ('Income Tax',            'Deduction', false),
  ('Provident Fund',        'Deduction', false),
  ('Loan Deduction',        'Deduction', false),
  ('Advance Salary',        'Deduction', false),
  ('Other Deduction',       'Deduction', false)
ON CONFLICT (name) DO NOTHING;
