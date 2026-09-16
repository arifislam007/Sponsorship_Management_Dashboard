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

CREATE TABLE IF NOT EXISTS lead_sheet_config (
  id SERIAL PRIMARY KEY,
  spreadsheet_id VARCHAR(200) NOT NULL,
  sheet_name VARCHAR(150) NOT NULL DEFAULT 'Sheet1',
  last_synced_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lead_whatsapp_messages (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES lead_leads(id) ON DELETE CASCADE,
  external_message_id VARCHAR(100),
  chat_id VARCHAR(50) NOT NULL,
  direction VARCHAR(10) NOT NULL, -- 'outbound' | 'inbound'
  message_type VARCHAR(20) NOT NULL DEFAULT 'text',
  body TEXT,
  from_me BOOLEAN NOT NULL DEFAULT false,
  is_group BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'sent', -- 'sent' | 'failed' | 'received'
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lead_leads_status      ON lead_leads(status);
CREATE INDEX IF NOT EXISTS idx_lead_leads_course       ON lead_leads(course_id);
CREATE INDEX IF NOT EXISTS idx_lead_followups_lead     ON lead_followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_followups_next     ON lead_followups(next_followup_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_messages_external_id ON lead_whatsapp_messages(external_message_id) WHERE external_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wa_messages_lead_id ON lead_whatsapp_messages(lead_id);
