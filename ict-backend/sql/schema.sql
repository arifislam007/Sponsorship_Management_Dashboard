-- ICT Module Schema
-- Tables for student ICT profiles and admission forms

CREATE TABLE IF NOT EXISTS ict_students (
  id SERIAL PRIMARY KEY,
  student_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE,
  phone VARCHAR(20),
  date_of_birth DATE,
  gender VARCHAR(10),
  father_name VARCHAR(150),
  mother_name VARCHAR(150),
  guardian_contact VARCHAR(20),
  nid_number VARCHAR(50),
  brc_number VARCHAR(50),
  current_address TEXT,
  permanent_address TEXT,
  religion VARCHAR(50),
  tribe VARCHAR(100),
  education VARCHAR(150),
  pwd BOOLEAN DEFAULT FALSE,
  disability_type VARCHAR(100),
  total_family_members INT,
  earning_members INT,
  total_monthly_income NUMERIC(12,2),
  applicant_monthly_income NUMERIC(12,2),
  school_going_children INT,
  family_healthcare_source VARCHAR(150),
  recent_medical_visits INT,
  monthly_expenses NUMERIC(12,2),
  house_rent NUMERIC(12,2),
  monthly_meals NUMERIC(12,2),
  has_savings BOOLEAN DEFAULT FALSE,
  has_bank_account BOOLEAN DEFAULT FALSE,
  social_security BOOLEAN DEFAULT FALSE,
  training_institute VARCHAR(150),
  admission_date DATE,
  course VARCHAR(100),
  batch VARCHAR(50),
  preferred_shift VARCHAR(50),
  registration_id VARCHAR(100),
  referral_source VARCHAR(200),
  prior_technical_skills BOOLEAN DEFAULT FALSE,
  prior_skills_details TEXT,
  certification_status VARCHAR(100),
  training_duration VARCHAR(100),
  dropout_status BOOLEAN DEFAULT FALSE,
  hours_attended INT,
  dropout_reason TEXT,
  competency BOOLEAN DEFAULT FALSE,
  improvement_areas VARCHAR(200),
  remarks TEXT,
  trainee_signature TEXT,
  office_signature TEXT,
  profile_image TEXT,
  bio TEXT,
  skills TEXT,
  certifications TEXT,
  admission_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ict_admissions (
  id SERIAL PRIMARY KEY,
  student_id INT REFERENCES ict_students(id) ON DELETE CASCADE,
  -- Section 1: Basic Applicant Information
  full_name VARCHAR(150) NOT NULL,
  father_name VARCHAR(150),
  mother_name VARCHAR(150),
  guardian_name VARCHAR(150),
  emergency_contact VARCHAR(20),
  occupational_status VARCHAR(100),
  date_of_birth DATE,
  gender VARCHAR(20),
  marital_status VARCHAR(50),
  nid_number VARCHAR(50),
  brc_number VARCHAR(50),

  -- Section 2: Contact Details
  current_address TEXT,
  current_district VARCHAR(150),
  current_police_station VARCHAR(150),
  current_union VARCHAR(150),
  current_post_office VARCHAR(150),
  current_post_code VARCHAR(20),
  current_village TEXT,
  permanent_address TEXT,
  permanent_district VARCHAR(150),
  permanent_police_station VARCHAR(150),
  permanent_union VARCHAR(150),
  permanent_post_office VARCHAR(150),
  permanent_post_code VARCHAR(20),
  permanent_village TEXT,

  -- Section 3: Educational & Personal Profile
  religion VARCHAR(100),
  tribe VARCHAR(150),
  education VARCHAR(200),
  pwd BOOLEAN DEFAULT FALSE,
  disability_type VARCHAR(100),

  -- Section 4: Socio-Economic Information
  total_family_members INT,
  source_of_income TEXT,
  number_of_earning_members INT,
  total_monthly_family_income NUMERIC(12,2),
  applicant_monthly_income NUMERIC(12,2),
  school_going_children INT,
  family_healthcare_source VARCHAR(200),
  recent_medical_visits INT,
  monthly_expenses NUMERIC(12,2),
  house_rent NUMERIC(12,2),
  monthly_meals NUMERIC(12,2),
  financial_status TEXT,
  has_savings BOOLEAN DEFAULT FALSE,
  has_bank_account BOOLEAN DEFAULT FALSE,
  social_security BOOLEAN DEFAULT FALSE,

  -- Section 5: Admission & Training Info
  training_institute VARCHAR(150),
  admission_date DATE DEFAULT CURRENT_DATE,
  course VARCHAR(100),
  batch VARCHAR(50),
  preferred_shift VARCHAR(50),
  registration_id VARCHAR(100),
  referral_source VARCHAR(200),
  prior_technical_skills BOOLEAN DEFAULT FALSE,
  prior_skills_details TEXT,
  certification_status VARCHAR(200),
  training_duration VARCHAR(100),

  -- Section 6: Official Use & Sign-off
  dropout_status BOOLEAN DEFAULT FALSE,
  hours_attended INT,
  dropout_reason TEXT,
  competency BOOLEAN DEFAULT FALSE,
  improvement_areas VARCHAR(200),
  remarks TEXT,
  trainee_signature VARCHAR(255),
  office_signature VARCHAR(255),
  profile_image TEXT,

  admission_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, processed
  admission_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ict_student_earnings (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES ict_students(id) ON DELETE CASCADE,
  earning_source VARCHAR(200) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  earning_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ict_courses (
  id SERIAL PRIMARY KEY,
  course_name VARCHAR(100) NOT NULL UNIQUE,
  course_code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  duration_months INT,
  course_level VARCHAR(50), -- beginner, intermediate, advanced
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ict_enrollments (
  id SERIAL PRIMARY KEY,
  student_id INT NOT NULL REFERENCES ict_students(id) ON DELETE CASCADE,
  course_id INT NOT NULL REFERENCES ict_courses(id) ON DELETE CASCADE,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  completion_date DATE,
  status VARCHAR(20) DEFAULT 'ongoing', -- ongoing, completed, dropped
  certificate_issued BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, course_id)
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_ict_students_email ON ict_students(email);
CREATE INDEX IF NOT EXISTS idx_ict_admissions_student_id ON ict_admissions(student_id);
CREATE INDEX IF NOT EXISTS idx_ict_admissions_status ON ict_admissions(admission_status);
CREATE INDEX IF NOT EXISTS idx_ict_enrollments_student_id ON ict_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_ict_enrollments_course_id ON ict_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_ict_student_earnings_student_id ON ict_student_earnings(student_id);
