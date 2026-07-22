DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sponsorship_status') THEN
        CREATE TYPE sponsorship_status AS ENUM ('Active', 'Ended');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ledger_type') THEN
        CREATE TYPE ledger_type AS ENUM ('Credit', 'Debit');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_type') THEN
        CREATE TYPE leave_type AS ENUM ('Casual', 'Special');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_request_status') THEN
        CREATE TYPE leave_request_status AS ENUM ('Pending', 'Approved', 'Rejected');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    class VARCHAR(50) NOT NULL,
    age INTEGER NOT NULL CHECK (age > 0),
    date_of_birth DATE,
    father_name VARCHAR(150),
    mother_name VARCHAR(150),
    family_income NUMERIC(12, 2),
    phone VARCHAR(30),
    bio TEXT,
    photo_url TEXT,
    is_sponsored BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS date_of_birth DATE;

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS father_name VARCHAR(150);

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS mother_name VARCHAR(150);

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS family_income NUMERIC(12, 2);

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS phone VARCHAR(30);

CREATE TABLE IF NOT EXISTS donors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    phone VARCHAR(30),
    country VARCHAR(100),
    total_contributed NUMERIC(12, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sponsorships (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    donor_id INTEGER NOT NULL REFERENCES donors(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    status sponsorship_status NOT NULL DEFAULT 'Active',
    period VARCHAR(20),
    payment_media VARCHAR(50),
    reference_number VARCHAR(100) NOT NULL UNIQUE,
    CONSTRAINT uq_sponsorship_period UNIQUE (student_id, donor_id, start_date)
);

CREATE TABLE IF NOT EXISTS accounting_ledger (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    voucher_ref VARCHAR(100) NOT NULL UNIQUE,
    particulars TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    type ledger_type NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    closing_balance NUMERIC(14, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS leave_balances (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    casual_balance NUMERIC(6, 2) NOT NULL DEFAULT 12,
    special_balance NUMERIC(6, 2) NOT NULL DEFAULT 0,
    special_last_accrued_at DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type leave_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested NUMERIC(6, 2) NOT NULL CHECK (days_requested > 0),
    reason TEXT NOT NULL,
    status leave_request_status NOT NULL DEFAULT 'Pending',
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Acknowledgment letters stored for reuse
CREATE TABLE IF NOT EXISTS acknowledgment_letters (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
    donor_id INTEGER REFERENCES donors(id) ON DELETE SET NULL,
    template_name VARCHAR(100),
    subject VARCHAR(255),
    content TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Accounting & Finance Module
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'acc_account_type') THEN
        CREATE TYPE acc_account_type AS ENUM ('Asset', 'Liability', 'Equity', 'Income', 'Expense');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'acc_voucher_type') THEN
        CREATE TYPE acc_voucher_type AS ENUM ('PV', 'RV', 'JV', 'CV');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'acc_voucher_status') THEN
        CREATE TYPE acc_voucher_status AS ENUM ('Draft', 'Submitted', 'Approved', 'Posted', 'Cancelled');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS acc_accounts (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    account_type acc_account_type NOT NULL,
    parent_id INTEGER REFERENCES acc_accounts(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS acc_projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(30) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS acc_vouchers (
    id SERIAL PRIMARY KEY,
    voucher_no VARCHAR(30) NOT NULL UNIQUE,
    voucher_type acc_voucher_type NOT NULL,
    date DATE NOT NULL,
    narration TEXT NOT NULL,
    project_id INTEGER REFERENCES acc_projects(id) ON DELETE SET NULL,
    status acc_voucher_status NOT NULL DEFAULT 'Draft',
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    submitted_at TIMESTAMP,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    posted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    posted_at TIMESTAMP,
    cancelled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMP,
    cancel_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS acc_voucher_lines (
    id SERIAL PRIMARY KEY,
    voucher_id INTEGER NOT NULL REFERENCES acc_vouchers(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES acc_accounts(id),
    debit NUMERIC(14, 2) NOT NULL DEFAULT 0,
    credit NUMERIC(14, 2) NOT NULL DEFAULT 0,
    narration TEXT,
    line_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS acc_ledger (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES acc_accounts(id),
    voucher_id INTEGER NOT NULL REFERENCES acc_vouchers(id) ON DELETE CASCADE,
    voucher_line_id INTEGER REFERENCES acc_voucher_lines(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    debit NUMERIC(14, 2) NOT NULL DEFAULT 0,
    credit NUMERIC(14, 2) NOT NULL DEFAULT 0,
    running_balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS acc_budgets (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL REFERENCES acc_accounts(id),
    project_id INTEGER REFERENCES acc_projects(id) ON DELETE SET NULL,
    fiscal_year INTEGER NOT NULL,
    month INTEGER CHECK (month BETWEEN 1 AND 12),
    budgeted_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_budget_account_month UNIQUE (account_id, project_id, fiscal_year, month)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_acc_ledger_account ON acc_ledger (account_id);
CREATE INDEX IF NOT EXISTS idx_acc_ledger_date ON acc_ledger (date);
CREATE INDEX IF NOT EXISTS idx_acc_voucher_lines_voucher ON acc_voucher_lines (voucher_id);
CREATE INDEX IF NOT EXISTS idx_acc_vouchers_date ON acc_vouchers (date);
CREATE INDEX IF NOT EXISTS idx_acc_vouchers_type ON acc_vouchers (voucher_type);

-- Default Chart of Accounts
INSERT INTO acc_accounts (code, name, account_type) VALUES
  ('1000', 'Assets', 'Asset'),
  ('1100', 'Cash in Hand', 'Asset'),
  ('1110', 'Petty Cash', 'Asset'),
  ('1200', 'Bank Accounts', 'Asset'),
  ('1210', 'Janata Bank - Main', 'Asset'),
  ('1220', 'Dutch-Bangla Bank', 'Asset'),
  ('1300', 'Mobile Banking', 'Asset'),
  ('1310', 'bKash Account', 'Asset'),
  ('1320', 'Nagad Account', 'Asset'),
  ('1400', 'Accounts Receivable', 'Asset'),
  ('1500', 'Prepaid Expenses', 'Asset'),
  ('2000', 'Liabilities', 'Liability'),
  ('2100', 'Accounts Payable', 'Liability'),
  ('2200', 'Accrued Expenses', 'Liability'),
  ('3000', 'Equity', 'Equity'),
  ('3100', 'Retained Surplus', 'Equity'),
  ('3200', 'General Reserve', 'Equity'),
  ('4000', 'Income', 'Income'),
  ('4100', 'Sponsorship Income', 'Income'),
  ('4200', 'Donation Income', 'Income'),
  ('4300', 'Grant Income', 'Income'),
  ('4400', 'ICT Training Fees', 'Income'),
  ('4500', 'Other Income', 'Income'),
  ('5000', 'Expenses', 'Expense'),
  ('5100', 'Student Support', 'Expense'),
  ('5110', 'School Fees', 'Expense'),
  ('5120', 'Books & Stationery', 'Expense'),
  ('5130', 'Uniform & Clothing', 'Expense'),
  ('5200', 'Program Expenses', 'Expense'),
  ('5210', 'ICT Program Costs', 'Expense'),
  ('5220', 'Women Development', 'Expense'),
  ('5230', 'Relief Operations', 'Expense'),
  ('5300', 'Administrative', 'Expense'),
  ('5310', 'Office Rent', 'Expense'),
  ('5320', 'Utilities', 'Expense'),
  ('5330', 'Communication', 'Expense'),
  ('5340', 'Staff Salaries', 'Expense'),
  ('5400', 'Bank Charges', 'Expense'),
  ('5500', 'Miscellaneous', 'Expense')
ON CONFLICT (code) DO NOTHING;

-- Default Projects
INSERT INTO acc_projects (name, code, description) VALUES
  ('General Administration', 'ADMIN', 'General organizational administration'),
  ('Puspokoli School', 'SCHOOL', 'Puspokoli school support program'),
  ('ICT Training', 'ICT', 'ICT training and digital literacy program'),
  ('Women Development', 'WOMEN', 'Women empowerment and development program'),
  ('Relief Operations', 'RELIEF', 'Emergency relief and disaster response'),
  ('Sponsorship Program', 'SPONSOR', 'Student sponsorship management')
ON CONFLICT (code) DO NOTHING;
