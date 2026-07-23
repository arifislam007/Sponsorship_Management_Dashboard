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
  ('Class-8', NULL, NULL)
ON CONFLICT (name, COALESCE(branch, '')) DO NOTHING;
