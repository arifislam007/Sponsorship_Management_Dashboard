-- School Operations Schema
-- Tables for class routines, curriculum, attendance, and exam schedules

-- ==========================================
-- 1. CLASS ROUTINES AND TEACHER SCHEDULES
-- ==========================================

CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  class_name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  capacity INT DEFAULT 40,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teachers (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE,
  phone VARCHAR(20),
  specialization VARCHAR(100),
  qualification VARCHAR(150),
  hire_date DATE,
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, on_leave
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS class_teacher_assignments (
  id SERIAL PRIMARY KEY,
  class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id INT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject VARCHAR(100),
  assigned_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'active', -- active, inactive
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, teacher_id, subject)
);

CREATE TABLE IF NOT EXISTS class_routines (
  id SERIAL PRIMARY KEY,
  class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week VARCHAR(10) NOT NULL, -- Monday, Tuesday, etc.
  period_number INT NOT NULL, -- 1st period, 2nd period, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject VARCHAR(100),
  teacher_id INT REFERENCES teachers(id) ON DELETE SET NULL,
  room_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, day_of_week, period_number)
);

-- ==========================================
-- 2. CURRICULUM ACTIVITIES
-- ==========================================

CREATE TABLE IF NOT EXISTS curriculum_activities (
  id SERIAL PRIMARY KEY,
  class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  activity_name VARCHAR(150) NOT NULL,
  description TEXT,
  subject VARCHAR(100),
  activity_type VARCHAR(50), -- assignment, project, test, practical, etc.
  assigned_date DATE NOT NULL,
  due_date DATE,
  teacher_id INT REFERENCES teachers(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed
  completion_percentage INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. TEACHER ATTENDANCE
-- ==========================================

CREATE TABLE IF NOT EXISTS teacher_attendance (
  id SERIAL PRIMARY KEY,
  teacher_id INT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL, -- present, absent, leave, late
  check_in_time TIME,
  check_out_time TIME,
  working_hours DECIMAL(5, 2),
  remarks TEXT,
  marked_by_id INT, -- admin user ID who marked attendance
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(teacher_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS teacher_attendance_summary (
  id SERIAL PRIMARY KEY,
  teacher_id INT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  month INT NOT NULL, -- 1-12
  year INT NOT NULL,
  total_days INT DEFAULT 0,
  present_days INT DEFAULT 0,
  absent_days INT DEFAULT 0,
  leave_days INT DEFAULT 0,
  late_days INT DEFAULT 0,
  total_working_hours DECIMAL(8, 2) DEFAULT 0,
  attendance_percentage DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(teacher_id, month, year)
);

-- ==========================================
-- 4. EXAM SCHEDULE PLANNER
-- ==========================================

CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  exam_name VARCHAR(100) NOT NULL,
  exam_type VARCHAR(50), -- midterm, final, unit, diagnostic, etc.
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, ongoing, completed, cancelled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_schedules (
  id SERIAL PRIMARY KEY,
  exam_id INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INT NOT NULL,
  total_marks INT DEFAULT 100,
  room_number VARCHAR(20),
  invigilator_id INT REFERENCES teachers(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, class_id, subject, exam_date)
);

CREATE TABLE IF NOT EXISTS exam_results (
  id SERIAL PRIMARY KEY,
  exam_schedule_id INT NOT NULL REFERENCES exam_schedules(id) ON DELETE CASCADE,
  student_id INT NOT NULL,
  obtained_marks DECIMAL(5, 2),
  total_marks INT DEFAULT 100,
  percentage DECIMAL(5, 2),
  grade VARCHAR(5),
  status VARCHAR(20) DEFAULT 'pending', -- pending, graded, approved
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_schedule_id, student_id)
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_class_routines_class_id ON class_routines(class_id);
CREATE INDEX IF NOT EXISTS idx_class_routines_teacher_id ON class_routines(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_routines_day_period ON class_routines(day_of_week, period_number);

CREATE INDEX IF NOT EXISTS idx_curriculum_activities_class_id ON curriculum_activities(class_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_activities_teacher_id ON curriculum_activities(teacher_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_activities_due_date ON curriculum_activities(due_date);

CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher_date ON teacher_attendance(teacher_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_date ON teacher_attendance(attendance_date);

CREATE INDEX IF NOT EXISTS idx_exam_schedules_exam_id ON exam_schedules(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_class_id ON exam_schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_exam_date ON exam_schedules(exam_date);

CREATE INDEX IF NOT EXISTS idx_exam_results_exam_schedule_id ON exam_results(exam_schedule_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student_id ON exam_results(student_id);
