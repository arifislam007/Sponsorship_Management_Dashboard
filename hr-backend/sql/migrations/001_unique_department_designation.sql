-- Dedupe existing department/designation rows (case-insensitive, trimmed match)
-- and enforce case-insensitive uniqueness going forward.
-- Safe to re-run: no-op once data is deduped and the indexes exist.

-- ── Departments ──────────────────────────────────────────────────────────────
WITH dupes AS (
  SELECT id,
         MIN(id) OVER (PARTITION BY LOWER(TRIM(name))) AS keep_id
  FROM hr_departments
)
UPDATE hr_employees e SET department_id = d.keep_id
FROM dupes d
WHERE e.department_id = d.id AND d.id <> d.keep_id;

WITH dupes AS (
  SELECT id,
         MIN(id) OVER (PARTITION BY LOWER(TRIM(name))) AS keep_id
  FROM hr_departments
)
UPDATE hr_designations des SET department_id = d.keep_id
FROM dupes d
WHERE des.department_id = d.id AND d.id <> d.keep_id;

WITH dupes AS (
  SELECT id,
         MIN(id) OVER (PARTITION BY LOWER(TRIM(name))) AS keep_id
  FROM hr_departments
)
DELETE FROM hr_departments dep
USING dupes d
WHERE dep.id = d.id AND d.id <> d.keep_id;

ALTER TABLE hr_departments DROP CONSTRAINT IF EXISTS hr_departments_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_departments_name_ci ON hr_departments (LOWER(TRIM(name)));

-- ── Designations ─────────────────────────────────────────────────────────────
WITH dupes AS (
  SELECT id,
         MIN(id) OVER (PARTITION BY LOWER(TRIM(title))) AS keep_id
  FROM hr_designations
)
UPDATE hr_employees e SET designation_id = d.keep_id
FROM dupes d
WHERE e.designation_id = d.id AND d.id <> d.keep_id;

WITH dupes AS (
  SELECT id,
         MIN(id) OVER (PARTITION BY LOWER(TRIM(title))) AS keep_id
  FROM hr_designations
)
DELETE FROM hr_designations des
USING dupes d
WHERE des.id = d.id AND d.id <> d.keep_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_designations_title_ci ON hr_designations (LOWER(TRIM(title)));
