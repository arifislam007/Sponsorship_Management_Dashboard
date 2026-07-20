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
