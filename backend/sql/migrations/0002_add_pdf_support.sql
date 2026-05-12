-- Add PDF filename column to acknowledgment_letters table
ALTER TABLE acknowledgment_letters
ADD COLUMN IF NOT EXISTS pdf_filename VARCHAR(255);

-- Add updated_at column if it doesn't exist
ALTER TABLE acknowledgment_letters
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
