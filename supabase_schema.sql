-- ════════════════════════════════════════════════════════════════════════════════
-- FORMA.AI / FOSTURA — Complete Supabase Database Schema
-- Run this script directly in your Supabase Project > SQL Editor
-- ════════════════════════════════════════════════════════════════════════════════

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ════════════════════════════════════════════════════════════════════════════════
-- 2. CREATE TABLES
-- ════════════════════════════════════════════════════════════════════════════════

-- A. WORKOUTS TABLE (Logs completed sessions, sets, volume, and reps)
CREATE TABLE IF NOT EXISTS public.workouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    day_title TEXT NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    completed_sets INTEGER DEFAULT 0,
    total_sets INTEGER DEFAULT 0,
    exercises JSONB DEFAULT '[]'::jsonb,
    calories INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'lbs',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- B. WORKOUT TEMPLATES TABLE (Custom saved routines and AI-generated templates)
CREATE TABLE IF NOT EXISTS public.workout_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    exercises JSONB DEFAULT '[]'::jsonb,
    is_example BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- C. USER METRICS TABLE (Bodyweight, body fat percentage, calorie tracking)
CREATE TABLE IF NOT EXISTS public.user_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    weight NUMERIC(6, 2),
    body_fat NUMERIC(4, 1),
    calories INTEGER,
    unit TEXT DEFAULT 'lbs',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- D. EXERCISE HISTORY TABLE (Set-by-set progress and PR tracking per exercise)
CREATE TABLE IF NOT EXISTS public.exercise_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    sets JSONB DEFAULT '[]'::jsonb,
    unit TEXT DEFAULT 'lbs',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- E. USER PROFILES TABLE (User preferences, units, target goals, and experience)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id TEXT PRIMARY KEY,
    preferred_unit TEXT DEFAULT 'lbs' CHECK (preferred_unit IN ('lbs', 'kg')),
    fitness_goal TEXT,
    experience_level TEXT,
    equipment TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════════════════════
-- 3. CREATE PERFORMANCE INDEXES
-- ════════════════════════════════════════════════════════════════════════════════

-- Workouts indexes
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON public.workouts (user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_created_at ON public.workouts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_user_created ON public.workouts (user_id, created_at DESC);

-- Templates indexes
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.workout_templates (user_id);

-- Metrics indexes
CREATE INDEX IF NOT EXISTS idx_metrics_user_id ON public.user_metrics (user_id);
CREATE INDEX IF NOT EXISTS idx_metrics_user_date ON public.user_metrics (user_id, date DESC);

-- Exercise history indexes
CREATE INDEX IF NOT EXISTS idx_history_user_id ON public.exercise_history (user_id);
CREATE INDEX IF NOT EXISTS idx_history_user_exercise ON public.exercise_history (user_id, exercise_name);

-- ════════════════════════════════════════════════════════════════════════════════
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════════════════
-- 5. IDEMPOTENT RLS POLICIES (Configured for Clerk Authentication & Anon Client)
-- ════════════════════════════════════════════════════════════════════════════════

-- Workouts Policies
DROP POLICY IF EXISTS "Allow select workouts" ON public.workouts;
DROP POLICY IF EXISTS "Allow insert workouts" ON public.workouts;
DROP POLICY IF EXISTS "Allow update workouts" ON public.workouts;
DROP POLICY IF EXISTS "Allow delete workouts" ON public.workouts;

CREATE POLICY "Allow select workouts" ON public.workouts
    FOR SELECT TO public USING (true);

CREATE POLICY "Allow insert workouts" ON public.workouts
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow update workouts" ON public.workouts
    FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete workouts" ON public.workouts
    FOR DELETE TO public USING (true);

-- Workout Templates Policies
DROP POLICY IF EXISTS "Allow select templates" ON public.workout_templates;
DROP POLICY IF EXISTS "Allow insert templates" ON public.workout_templates;
DROP POLICY IF EXISTS "Allow update templates" ON public.workout_templates;
DROP POLICY IF EXISTS "Allow delete templates" ON public.workout_templates;

CREATE POLICY "Allow select templates" ON public.workout_templates
    FOR SELECT TO public USING (true);

CREATE POLICY "Allow insert templates" ON public.workout_templates
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow update templates" ON public.workout_templates
    FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete templates" ON public.workout_templates
    FOR DELETE TO public USING (true);

-- User Metrics Policies
DROP POLICY IF EXISTS "Allow select metrics" ON public.user_metrics;
DROP POLICY IF EXISTS "Allow insert metrics" ON public.user_metrics;
DROP POLICY IF EXISTS "Allow update metrics" ON public.user_metrics;
DROP POLICY IF EXISTS "Allow delete metrics" ON public.user_metrics;

CREATE POLICY "Allow select metrics" ON public.user_metrics
    FOR SELECT TO public USING (true);

CREATE POLICY "Allow insert metrics" ON public.user_metrics
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow update metrics" ON public.user_metrics
    FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete metrics" ON public.user_metrics
    FOR DELETE TO public USING (true);

-- Exercise History Policies
DROP POLICY IF EXISTS "Allow select history" ON public.exercise_history;
DROP POLICY IF EXISTS "Allow insert history" ON public.exercise_history;
DROP POLICY IF EXISTS "Allow update history" ON public.exercise_history;
DROP POLICY IF EXISTS "Allow delete history" ON public.exercise_history;

CREATE POLICY "Allow select history" ON public.exercise_history
    FOR SELECT TO public USING (true);

CREATE POLICY "Allow insert history" ON public.exercise_history
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow update history" ON public.exercise_history
    FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete history" ON public.exercise_history
    FOR DELETE TO public USING (true);

-- User Profiles Policies
DROP POLICY IF EXISTS "Allow select profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow update profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow delete profiles" ON public.user_profiles;

CREATE POLICY "Allow select profiles" ON public.user_profiles
    FOR SELECT TO public USING (true);

CREATE POLICY "Allow insert profiles" ON public.user_profiles
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow update profiles" ON public.user_profiles
    FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete profiles" ON public.user_profiles
    FOR DELETE TO public USING (true);

-- ════════════════════════════════════════════════════════════════════════════════
-- 6. GRANT API ROLE PERMISSIONS
-- ════════════════════════════════════════════════════════════════════════════════

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════════════════
-- 7. REALTIME SETUP (Optional: enables live synchronization if subscribed)
-- ════════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'workouts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.workouts;
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════════
-- 8. VERIFICATION QUERY
-- ════════════════════════════════════════════════════════════════════════════════
-- Check all created tables in schema public
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
