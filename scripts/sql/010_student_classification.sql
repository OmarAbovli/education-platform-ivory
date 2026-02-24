-- Add student classification: 'center' or 'online'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'classification'
  ) THEN
    ALTER TABLE users
      ADD COLUMN classification TEXT
      CHECK (classification IN ('center', 'online'))
      DEFAULT 'center';
  END IF;
END
$$;

-- Backfill existing students to 'center' if NULL
UPDATE users
SET classification = 'center'
WHERE role = 'student' AND (classification IS NULL OR classification NOT IN ('center','online'));

-- Optional index to speed up filtering
CREATE INDEX IF NOT EXISTS idx_users_role_classification ON users(role, classification);
