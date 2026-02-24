-- ========================================================
-- DATABASE SCHEMA FIX FOR YOURPLATFORM
-- Run this if you see "column does not exist" errors
-- ========================================================

BEGIN;

-- 1. Fix packages table (Rename grade to grades and change to array)
DO $$
BEGIN
    -- Check if 'grade' exists and 'grades' doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'packages' AND column_name = 'grade') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'packages' AND column_name = 'grades') THEN
        -- Add grades as array
        ALTER TABLE packages ADD COLUMN grades INT[];
        -- Migrate data if any
        UPDATE packages SET grades = ARRAY[grade] WHERE grade IS NOT NULL;
        -- Drop old column
        ALTER TABLE packages DROP COLUMN grade;
        RAISE NOTICE 'Updated packages: grade -> grades (INT[])';
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'packages' AND column_name = 'grades') THEN
        ALTER TABLE packages ADD COLUMN grades INT[];
        RAISE NOTICE 'Added grades (INT[]) to packages';
    END IF;
END $$;

-- 2. Fix live_sessions table (Add missing columns)
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS grades INT[];
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS month INT;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS package_ids UUID[];

-- 3. Fix voice_calls table (Add provider and fix grade check)
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'jitsi';
ALTER TABLE voice_calls DROP CONSTRAINT IF EXISTS voice_calls_grade_check;
ALTER TABLE voice_calls ADD CONSTRAINT voice_calls_grade_check CHECK (grade BETWEEN 0 AND 3);

-- 4. Create missing teacher_live_status table
CREATE TABLE IF NOT EXISTS teacher_live_status (
  teacher_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  grades INT[],
  package_ids UUID[],
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMIT;

-- Success Message
DO $$
BEGIN
    RAISE NOTICE '✅ Database schema fixes applied successfully!';
END $$;
