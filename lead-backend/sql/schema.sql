-- Lead Management Module Schema (lead_ prefix)

CREATE TABLE IF NOT EXISTS lead_courses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(30),
  duration_months INTEGER,
  fee NUMERIC(12,2),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lead_leads (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(150),
  gender VARCHAR(10),
  address TEXT,
  course_id INTEGER REFERENCES lead_courses(id) ON DELETE SET NULL,
  source VARCHAR(30) NOT NULL DEFAULT 'Other',
  reference_name VARCHAR(150),
  status VARCHAR(20) NOT NULL DEFAULT 'New',
  assigned_to VARCHAR(150),
  notes TEXT,
  admission_date DATE,
  batch VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lead_followups (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES lead_leads(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  followup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  method VARCHAR(20) NOT NULL DEFAULT 'Call',
  outcome TEXT,
  next_followup_date DATE,
  created_by VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lead_leads_status      ON lead_leads(status);
CREATE INDEX IF NOT EXISTS idx_lead_leads_course       ON lead_leads(course_id);
CREATE INDEX IF NOT EXISTS idx_lead_followups_lead     ON lead_followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_followups_next     ON lead_followups(next_followup_date);
