-- Classes
CREATE TABLE IF NOT EXISTS sc_classes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  branch VARCHAR(100),
  class_teacher VARCHAR(150),
  total_students INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unique index treating NULL branch as '' so duplicates are blocked even with NULL
CREATE UNIQUE INDEX IF NOT EXISTS sc_classes_name_branch_uniq ON sc_classes (name, COALESCE(branch, ''));

-- Students
CREATE TABLE IF NOT EXISTS sc_students (
  id SERIAL PRIMARY KEY,
  student_code VARCHAR(50) UNIQUE,
  full_name VARCHAR(200) NOT NULL,
  class_id INTEGER REFERENCES sc_classes(id),
  gender VARCHAR(20),
  date_of_birth DATE,
  guardian_name VARCHAR(200),
  guardian_mobile VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily Attendance
CREATE TABLE IF NOT EXISTS sc_attendance (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES sc_classes(id),
  attendance_date DATE NOT NULL,
  student_id INTEGER NOT NULL REFERENCES sc_students(id),
  status VARCHAR(20) NOT NULL DEFAULT 'Absent' CHECK (status IN ('Present', 'Absent', 'Late')),
  notes TEXT,
  recorded_by VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, attendance_date, student_id)
);

-- Classroom Monitoring Forms
CREATE TABLE IF NOT EXISTS sc_monitoring_forms (
  id SERIAL PRIMARY KEY,
  form_code VARCHAR(50) UNIQUE,
  monitoring_date DATE NOT NULL,
  class_id INTEGER REFERENCES sc_classes(id),
  class_name VARCHAR(100),
  branch VARCHAR(100),
  class_teacher VARCHAR(150),
  observer_name VARCHAR(150) NOT NULL,
  status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted')),
  overall_rating VARCHAR(60),
  good_points TEXT,
  improvement_areas TEXT,
  next_week_actions TEXT,
  total_items INTEGER DEFAULT 14,
  yes_count INTEGER DEFAULT 0,
  score_percent DECIMAL(5,2) DEFAULT 0,
  submitted_at TIMESTAMP,
  created_by VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monitoring Evaluation Items (yes/no per form)
CREATE TABLE IF NOT EXISTS sc_monitoring_items (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL REFERENCES sc_monitoring_forms(id) ON DELETE CASCADE,
  item_key VARCHAR(100) NOT NULL,
  item_label TEXT NOT NULL,
  response BOOLEAN,
  comment TEXT,
  UNIQUE(form_id, item_key)
);

-- Class-wise Attendance Summary (quick aggregate entry, without per-student records)
CREATE TABLE IF NOT EXISTS sc_class_attendance_summary (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES sc_classes(id),
  attendance_date DATE NOT NULL,
  total_students INTEGER NOT NULL DEFAULT 0,
  attended INTEGER NOT NULL DEFAULT 0,
  absent INTEGER GENERATED ALWAYS AS (total_students - attended) STORED,
  absent_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_students > 0 THEN ROUND(((total_students - attended)::DECIMAL / total_students) * 100, 2) ELSE 0 END
  ) STORED,
  notes TEXT,
  recorded_by VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, attendance_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sc_attendance_date ON sc_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_sc_attendance_class ON sc_attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_sc_monitoring_date ON sc_monitoring_forms(monitoring_date);
CREATE INDEX IF NOT EXISTS idx_sc_monitoring_class ON sc_monitoring_forms(class_id);
CREATE INDEX IF NOT EXISTS idx_sc_students_class ON sc_students(class_id);

-- Seed default classes for Puspokoli School
INSERT INTO sc_classes (name, branch, class_teacher) VALUES
  ('Pre-Primary', NULL, NULL),
  ('Class-1', NULL, NULL),
  ('Class-2', NULL, NULL),
  ('Class-3', NULL, NULL),
  ('Class-4', NULL, NULL),
  ('Class-5', NULL, NULL),
  ('Class-6', NULL, NULL),
  ('Class-7', NULL, NULL),
  ('Class-8', NULL, NULL),
  ('Class-9', NULL, NULL),
  ('Class-10', NULL, NULL)
ON CONFLICT (name, COALESCE(branch, '')) DO NOTHING;

-- ── Routine Planner ──────────────────────────────────────────────────────────

-- Subjects (school-wide master list, staff-managed)
CREATE TABLE IF NOT EXISTS sc_subjects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Classrooms (physical rooms, separate from the class/section itself)
CREATE TABLE IF NOT EXISTS sc_classrooms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  capacity INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default classroom for a class/section, overridable per period below.
ALTER TABLE sc_classes ADD COLUMN IF NOT EXISTS classroom_id INTEGER REFERENCES sc_classrooms(id) ON DELETE SET NULL;

-- Tiffin (break) slot for a class's routine. It's a single daily break shown
-- as a full-width row in the grid, not a per-subject period — so it lives on
-- sc_classes rather than sc_routine_periods. tiffin_after_period is the period
-- number it follows (e.g. 4 = break shown after Period 4); NULL means no
-- tiffin break configured for this class.
ALTER TABLE sc_classes ADD COLUMN IF NOT EXISTS tiffin_after_period SMALLINT;
ALTER TABLE sc_classes ADD COLUMN IF NOT EXISTS tiffin_start_time TIME;
ALTER TABLE sc_classes ADD COLUMN IF NOT EXISTS tiffin_end_time TIME;

-- Number of period rows shown in this class's routine grid. Kept explicit
-- (rather than only inferred from the highest period_number with a slot) so
-- staff can add a blank row ahead of filling it in, or remove a trailing
-- unused row outright.
ALTER TABLE sc_classes ADD COLUMN IF NOT EXISTS period_count SMALLINT NOT NULL DEFAULT 7;

-- Morning vs Day shift. Two classes in different shifts can legitimately
-- share "Period 1" at completely different clock times, so routine conflict
-- checks (teacher/classroom double-booking) are scoped to the same shift —
-- see sc_routine_periods' PUT /slot route.
ALTER TABLE sc_classes ADD COLUMN IF NOT EXISTS shift VARCHAR(20) NOT NULL DEFAULT 'Morning' CHECK (shift IN ('Morning', 'Day'));

-- One row per (class, day, period) slot. teacher_employee_id references
-- hr_employees.id directly (same shared Postgres database as the HR service,
-- so a live JOIN resolves name/designation/phone on every read without
-- duplicating or snapshotting teacher data here).
CREATE TABLE IF NOT EXISTS sc_routine_periods (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES sc_classes(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5), -- 1=Sunday .. 5=Thursday
  period_number SMALLINT NOT NULL CHECK (period_number >= 1),
  start_time TIME,
  end_time TIME,
  subject_id INTEGER REFERENCES sc_subjects(id) ON DELETE SET NULL,
  teacher_employee_id INTEGER,
  classroom_id INTEGER REFERENCES sc_classrooms(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, day_of_week, period_number)
);
CREATE INDEX IF NOT EXISTS idx_sc_routine_periods_class ON sc_routine_periods(class_id);
CREATE INDEX IF NOT EXISTS idx_sc_routine_periods_teacher ON sc_routine_periods(teacher_employee_id);

-- A "cluster" (e.g. one teacher holding a 2-hour block): the entry at
-- period_number occupies this many consecutive periods as one merged cell.
-- Periods it covers (period_number+1 .. period_number+period_span-1) must
-- stay empty — they're not separate rows, the route layer rejects placing
-- anything there while covered and rejects a span that would overlap another
-- entry already in those periods.
ALTER TABLE sc_routine_periods ADD COLUMN IF NOT EXISTS period_span SMALLINT NOT NULL DEFAULT 1 CHECK (period_span >= 1);

-- A cluster can cover more than one subject (e.g. a 2-hour block where the
-- same teacher/room runs Math then Science). subject_id is superseded by
-- this array and left undropped (harmless) per the usual migration
-- convention; new rows are written/read via subject_ids only. Backfill runs
-- every boot but is a no-op once subject_ids is populated.
ALTER TABLE sc_routine_periods ADD COLUMN IF NOT EXISTS subject_ids INTEGER[] NOT NULL DEFAULT '{}';
UPDATE sc_routine_periods SET subject_ids = ARRAY[subject_id] WHERE subject_id IS NOT NULL AND cardinality(subject_ids) = 0;

-- One active approval record per class, or one for the whole-school routine
-- (class_id NULL). Head Teacher or Assistant Head Teacher can each approve
-- solo — this is a single-signer sign-off, not a vote/majority engine.
CREATE TABLE IF NOT EXISTS sc_routine_approvals (
  id SERIAL PRIMARY KEY,
  class_id INTEGER REFERENCES sc_classes(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by_employee_id INTEGER,
  approved_by_name VARCHAR(150),
  approved_by_title VARCHAR(100),
  approved_at TIMESTAMP,
  rejected_reason TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS sc_routine_approvals_class_uniq ON sc_routine_approvals (COALESCE(class_id, -1));
CREATE INDEX IF NOT EXISTS idx_sc_routine_approvals_status ON sc_routine_approvals(status);
