ALTER TABLE ict_inventory ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(150);
ALTER TABLE ict_inventory ADD COLUMN IF NOT EXISTS assigned_employee_id INT;
