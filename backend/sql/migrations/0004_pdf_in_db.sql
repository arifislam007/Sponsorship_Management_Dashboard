-- Store PDF content directly in the database as binary data
ALTER TABLE acknowledgment_letters ADD COLUMN IF NOT EXISTS pdf_data BYTEA;
