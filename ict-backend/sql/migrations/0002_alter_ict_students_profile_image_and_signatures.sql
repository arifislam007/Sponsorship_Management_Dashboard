-- Migration: change profile_image and signature columns to TEXT to accommodate base64 images
BEGIN;

ALTER TABLE ict_students
  ALTER COLUMN profile_image TYPE TEXT USING profile_image::text;

ALTER TABLE ict_students
  ALTER COLUMN trainee_signature TYPE TEXT USING trainee_signature::text;

ALTER TABLE ict_students
  ALTER COLUMN office_signature TYPE TEXT USING office_signature::text;

COMMIT;
