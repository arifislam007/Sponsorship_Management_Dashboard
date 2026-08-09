ALTER TABLE ict_inventory ADD COLUMN IF NOT EXISTS purchase_date DATE;
ALTER TABLE ict_inventory ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(150);
ALTER TABLE ict_inventory ADD COLUMN IF NOT EXISTS warranty_period VARCHAR(50);
