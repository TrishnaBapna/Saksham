-- =======================================================================
-- SAKSHAM POSTGRESQL / SUPABASE DATABASE SCHEMA
-- Assisted Living & Cognitive Independence Platform
-- =======================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------
-- 1. PROFILES TABLE (Patients, Caregivers, Doctors)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('patient', 'caregiver', 'doctor')),
  caregiver_name VARCHAR(255),
  caregiver_phone VARCHAR(50),
  lang VARCHAR(20) DEFAULT 'en',
  pin VARCHAR(20),
  is_guest BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------
-- 2. TASKS TABLE (Scheduled Routine & Guided Tasks)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  time VARCHAR(50) NOT NULL,
  raw_time VARCHAR(20),
  sound VARCHAR(50) DEFAULT 'bell',
  done BOOLEAN DEFAULT FALSE,
  tag VARCHAR(50) DEFAULT 'Wellness',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'not_done')),
  latency_minutes INTEGER DEFAULT 5,
  cue_question TEXT,
  cue_options JSONB DEFAULT '[]'::jsonb,
  correct_option_index INTEGER DEFAULT 0,
  cue_hint TEXT,
  attempts_left INTEGER DEFAULT 3,
  runner_steps JSONB DEFAULT '[]'::jsonb,
  diagnostic_question TEXT,
  diagnostic_checkpoints JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);

-- -----------------------------------------------------------------------
-- 3. LOVED_ONES TABLE (Familiar Face Recall & Contacts)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS loved_ones (
  id BIGINT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  whatsapp VARCHAR(50),
  email VARCHAR(255),
  clue TEXT,
  img TEXT,
  options JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loved_ones_user_id ON loved_ones(user_id);

-- -----------------------------------------------------------------------
-- 4. CAREGIVER_ALERTS TABLE (Real-time and historic caregiver alerts)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS caregiver_alerts (
  id BIGINT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  time VARCHAR(50) NOT NULL,
  text TEXT NOT NULL,
  severity VARCHAR(50) DEFAULT 'info',
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caregiver_alerts_user_id ON caregiver_alerts(user_id);

-- -----------------------------------------------------------------------
-- 5. CLINICAL_NOTES TABLE (Caregiver & Doctor Clinical Observations)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical_notes (
  id BIGINT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  author_role VARCHAR(50) DEFAULT 'caregiver' CHECK (author_role IN ('caregiver', 'doctor')),
  author_name VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_user_id ON clinical_notes(user_id);

-- -----------------------------------------------------------------------
-- 6. DOCTOR_DIRECTIVES TABLE (Neurologist Protocols & Guidance)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctor_directives (
  id BIGINT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_name VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctor_directives_user_id ON doctor_directives(user_id);

-- -----------------------------------------------------------------------
-- 7. TELEMETRY_RECORDS TABLE (Daily Adherence & Motor Metrics)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telemetry_records (
  id BIGINT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  day_number INTEGER,
  status VARCHAR(50) DEFAULT 'all_done' CHECK (status IN ('all_done', 'delayed', 'missed', 'pending')),
  tasks_completed INTEGER DEFAULT 0,
  tasks_total INTEGER DEFAULT 5,
  latency_minutes INTEGER DEFAULT 0,
  speech_db NUMERIC(5,2) DEFAULT 70.0,
  tremor_amplitude_cm NUMERIC(4,2) DEFAULT 1.0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_user_date ON telemetry_records(user_id, record_date);

-- -----------------------------------------------------------------------
-- 8. USER_PROGRESSION TABLE (Streak, Hydration, Badges)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_progression (
  id BIGINT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  streak INTEGER DEFAULT 7,
  water_logged INTEGER DEFAULT 5,
  water_target_glasses INTEGER DEFAULT 8,
  badges JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progression_user_id ON user_progression(user_id);

-- -----------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE loved_ones ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_directives ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progression ENABLE ROW LEVEL SECURITY;

-- Allow anon public access for frontend demo / prototyping
-- (In production, replace with auth.uid() = user_id checks)
CREATE POLICY "Public profiles access" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public tasks access" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public loved_ones access" ON loved_ones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public caregiver_alerts access" ON caregiver_alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public clinical_notes access" ON clinical_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public doctor_directives access" ON doctor_directives FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public telemetry_records access" ON telemetry_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public user_progression access" ON user_progression FOR ALL USING (true) WITH CHECK (true);
