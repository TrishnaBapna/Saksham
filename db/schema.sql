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
  role VARCHAR(50) NOT NULL CHECK (role IN ('patient', 'caregiver', 'doctor', 'administrator')),
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
-- 9. CAREGIVER_PATIENT_LINKS (Explicit authorization from patient to caregiver)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS caregiver_patient_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  caregiver_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'pending')),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(patient_id, caregiver_id)
);

CREATE INDEX IF NOT EXISTS idx_cpl_patient ON caregiver_patient_links(patient_id);
CREATE INDEX IF NOT EXISTS idx_cpl_caregiver ON caregiver_patient_links(caregiver_id);

-- -----------------------------------------------------------------------
-- 10. DOCTOR_PATIENT_LINKS (Clinical assignment from hospital admin)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctor_patient_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'pending')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by TEXT REFERENCES profiles(id),
  revoked_at TIMESTAMPTZ,
  UNIQUE(patient_id, doctor_id)
);

CREATE INDEX IF NOT EXISTS idx_dpl_patient ON doctor_patient_links(patient_id);
CREATE INDEX IF NOT EXISTS idx_dpl_doctor ON doctor_patient_links(doctor_id);

-- -----------------------------------------------------------------------
-- 11. AUDIT_LOGS (Immutable administrative and security actions)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT REFERENCES profiles(id),
  actor_role VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- -----------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES — HARDENED LEAST-PRIVILEGE MODEL
-- -----------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE loved_ones ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_directives ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_patient_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_patient_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES:
-- Patients/Caregivers/Doctors can view and manage their own profile.
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- Authorized caregivers can view linked patient profiles
CREATE POLICY "Caregivers can view linked patient profile" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM caregiver_patient_links
      WHERE patient_id = profiles.id AND caregiver_id = auth.uid()::text AND status = 'active'
    )
  );

-- Assigned doctors can view assigned patient profiles
CREATE POLICY "Doctors can view assigned patient profile" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_links
      WHERE patient_id = profiles.id AND doctor_id = auth.uid()::text AND status = 'active'
    )
  );

-- Administrators can view all profiles for provisioning
CREATE POLICY "Admins can view profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid()::text AND p.role = 'administrator')
  );

-- 2. TASKS:
CREATE POLICY "Patients manage own tasks" ON tasks
  FOR ALL USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Caregivers manage linked patient tasks" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM caregiver_patient_links
      WHERE patient_id = tasks.user_id AND caregiver_id = auth.uid()::text AND status = 'active'
    )
  );

CREATE POLICY "Doctors read assigned patient tasks" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_links
      WHERE patient_id = tasks.user_id AND doctor_id = auth.uid()::text AND status = 'active'
    )
  );

-- 3. LOVED_ONES:
CREATE POLICY "Patients manage loved ones" ON loved_ones
  FOR ALL USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Caregivers view and update loved ones" ON loved_ones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM caregiver_patient_links
      WHERE patient_id = loved_ones.user_id AND caregiver_id = auth.uid()::text AND status = 'active'
    )
  );

-- 4. CAREGIVER_ALERTS:
CREATE POLICY "Patients read own alerts" ON caregiver_alerts
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Caregivers manage alerts for linked patients" ON caregiver_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM caregiver_patient_links
      WHERE patient_id = caregiver_alerts.user_id AND caregiver_id = auth.uid()::text AND status = 'active'
    )
  );

-- 5. CLINICAL_NOTES:
CREATE POLICY "Patients view own clinical notes" ON clinical_notes
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Caregivers create and read notes for linked patients" ON clinical_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM caregiver_patient_links
      WHERE patient_id = clinical_notes.user_id AND caregiver_id = auth.uid()::text AND status = 'active'
    )
  );

CREATE POLICY "Doctors read notes for assigned patients" ON clinical_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_links
      WHERE patient_id = clinical_notes.user_id AND doctor_id = auth.uid()::text AND status = 'active'
    )
  );

-- 6. DOCTOR_DIRECTIVES:
CREATE POLICY "Patients view own doctor directives" ON doctor_directives
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Doctors manage directives for assigned patients" ON doctor_directives
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_links
      WHERE patient_id = doctor_directives.user_id AND doctor_id = auth.uid()::text AND status = 'active'
    )
  );

CREATE POLICY "Caregivers view directives for linked patients" ON doctor_directives
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM caregiver_patient_links
      WHERE patient_id = doctor_directives.user_id AND caregiver_id = auth.uid()::text AND status = 'active'
    )
  );

-- 7. TELEMETRY_RECORDS:
CREATE POLICY "Patients insert and view own telemetry" ON telemetry_records
  FOR ALL USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Caregivers view linked patient telemetry" ON telemetry_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM caregiver_patient_links
      WHERE patient_id = telemetry_records.user_id AND caregiver_id = auth.uid()::text AND status = 'active'
    )
  );

CREATE POLICY "Doctors view assigned patient telemetry" ON telemetry_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_links
      WHERE patient_id = telemetry_records.user_id AND doctor_id = auth.uid()::text AND status = 'active'
    )
  );

-- 8. USER_PROGRESSION:
CREATE POLICY "Patients view and update own progression" ON user_progression
  FOR ALL USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Caregivers view linked patient progression" ON user_progression
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM caregiver_patient_links
      WHERE patient_id = user_progression.user_id AND caregiver_id = auth.uid()::text AND status = 'active'
    )
  );

-- 9. CAREGIVER_PATIENT_LINKS:
CREATE POLICY "Patients manage caregiver authorizations" ON caregiver_patient_links
  FOR ALL USING (auth.uid()::text = patient_id)
  WITH CHECK (auth.uid()::text = patient_id);

CREATE POLICY "Caregivers view own authorizations" ON caregiver_patient_links
  FOR SELECT USING (auth.uid()::text = caregiver_id);

-- 10. DOCTOR_PATIENT_LINKS:
CREATE POLICY "Doctors view own assignments" ON doctor_patient_links
  FOR SELECT USING (auth.uid()::text = doctor_id);

CREATE POLICY "Patients view own doctor assignments" ON doctor_patient_links
  FOR SELECT USING (auth.uid()::text = patient_id);

-- 11. AUDIT_LOGS:
CREATE POLICY "Authenticated users append audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Administrators read audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()::text AND role = 'administrator')
  );
