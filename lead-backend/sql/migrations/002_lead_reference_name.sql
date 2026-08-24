-- Store the referee's name when a lead's source is "Reference".
ALTER TABLE lead_leads ADD COLUMN IF NOT EXISTS reference_name VARCHAR(150);
