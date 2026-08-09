-- Migration: category-based serial numbers and hardware specs for ICT inventory
BEGIN;

CREATE TABLE IF NOT EXISTS ict_inventory_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  prefix VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ict_inventory_serial_counters (
  prefix VARCHAR(10) PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0
);

INSERT INTO ict_inventory_categories (name, prefix) VALUES
  ('Laptop', 'COM'),
  ('Desktop', 'COM'),
  ('Printer', 'PRN'),
  ('Monitor', 'MON'),
  ('Pendrive', 'USB'),
  ('External HDD', 'HDD')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE ict_inventory ADD COLUMN IF NOT EXISTS category_id INT REFERENCES ict_inventory_categories(id);
ALTER TABLE ict_inventory ADD COLUMN IF NOT EXISTS serial_no VARCHAR(50);
ALTER TABLE ict_inventory ADD COLUMN IF NOT EXISTS cpu VARCHAR(100);
ALTER TABLE ict_inventory ADD COLUMN IF NOT EXISTS ram VARCHAR(50);
ALTER TABLE ict_inventory ADD COLUMN IF NOT EXISTS ssd VARCHAR(50);
ALTER TABLE ict_inventory ADD COLUMN IF NOT EXISTS hdd VARCHAR(50);
ALTER TABLE ict_inventory ADD COLUMN IF NOT EXISTS device_serial_no VARCHAR(150);

ALTER TABLE ict_inventory DROP COLUMN IF EXISTS name;
ALTER TABLE ict_inventory DROP COLUMN IF EXISTS category;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ict_inventory_serial_no ON ict_inventory(serial_no) WHERE serial_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ict_inventory_category_id ON ict_inventory(category_id);

COMMIT;
