-- Track which numbered attempt (1st..5th) each follow-up is, per lead.
ALTER TABLE lead_followups ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY lead_id ORDER BY followup_date, id) AS rn
  FROM lead_followups
)
UPDATE lead_followups f
SET attempt_number = n.rn
FROM numbered n
WHERE f.id = n.id AND f.attempt_number <> n.rn;
