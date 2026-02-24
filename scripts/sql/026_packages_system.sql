-- 026_packages_system.sql

-- Step 1: Create the new video_packages table
CREATE TABLE IF NOT EXISTS video_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0, -- Price in cents
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add an index for faster queries on teacher_id
CREATE INDEX IF NOT EXISTS idx_video_packages_teacher_id ON video_packages(teacher_id);

-- Step 2: Alter the videos table to link to packages instead of months
-- Add the new package_id column, initially allowing NULLs to handle existing data
ALTER TABLE videos ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES video_packages(id) ON DELETE SET NULL;

-- Note: You will need a separate script or manual process to migrate existing videos
-- from the old 'month' system to the new 'package_id' system.
-- For example, create a package for each month and assign the videos.

-- Once migration is complete, you can drop the 'month' column.
-- For now, we will keep it to avoid data loss.
-- ALTER TABLE videos DROP COLUMN IF EXISTS month;

-- Step 3: Alter the purchases table to link to packages
-- Add the package_id column
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES video_packages(id);

-- Drop the old month-related columns
-- ALTER TABLE purchases DROP COLUMN IF EXISTS months_count;
-- ALTER TABLE purchases DROP COLUMN IF EXISTS months_list;
-- Note: We keep these columns for now to avoid breaking existing purchase records.
-- A data migration script would be needed to populate the new package_id based on old values.

-- Step 4: Drop the old student_month_access table
-- This table is now redundant. Access is determined by successful purchases of packages.
DROP TABLE IF EXISTS student_month_access;

-- Optional: Create a view for easy access to student purchases and package info
CREATE OR REPLACE VIEW student_package_purchases AS
SELECT
  p.user_id AS student_id,
  p.package_id,
  vp.teacher_id,
  vp.name AS package_name,
  vp.price AS package_price,
  p.paid_at
FROM purchases p
JOIN video_packages vp ON p.package_id = vp.id
WHERE p.status = 'paid';

COMMENT ON VIEW student_package_purchases IS 'Provides a quick way to see which students have successfully purchased which packages.';
