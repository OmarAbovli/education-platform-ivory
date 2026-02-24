-- 027_package_access_and_live_restrictions.sql

-- 1) Manual package access granted by teachers
CREATE TABLE IF NOT EXISTS student_package_access (
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES video_packages(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by TEXT,
  PRIMARY KEY (student_id, teacher_id, package_id)
);

CREATE INDEX IF NOT EXISTS idx_student_package_access_teacher ON student_package_access(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_package_access_package ON student_package_access(package_id);

-- 2) Package grade classification (can be single-grade or multi-grade)
ALTER TABLE video_packages
  ADD COLUMN IF NOT EXISTS grades INT[];

-- 3) Live session restrictions by grade and packages

-- Scheduled live sessions: optional list of required packages
ALTER TABLE live_sessions
  ADD COLUMN IF NOT EXISTS package_ids UUID[];

-- Go-live status: optional grade and package restrictions
ALTER TABLE teacher_live_status
  ADD COLUMN IF NOT EXISTS grades INT[],
  ADD COLUMN IF NOT EXISTS package_ids UUID[];
