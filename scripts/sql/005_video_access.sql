-- Add video category, free flag, and month
ALTER TABLE videos ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS month INT CHECK (month BETWEEN 1 AND 12);

-- Per-teacher theme colors
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_primary TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_secondary TEXT;

-- Per-student per-teacher month access
CREATE TABLE IF NOT EXISTS student_month_access (
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  allowed_months INT[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (student_id, teacher_id)
);

-- Helpful index for filtering by free videos
CREATE INDEX IF NOT EXISTS idx_videos_is_free ON videos(is_free);
