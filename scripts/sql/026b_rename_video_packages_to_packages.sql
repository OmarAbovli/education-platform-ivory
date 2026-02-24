-- ============================================
-- Fix: Rename video_packages to packages
-- ============================================
-- This migration renames the video_packages table to packages
-- to match the codebase expectations.

-- Run this BEFORE 035_package_codes_system.sql

-- Rename the table
ALTER TABLE IF EXISTS video_packages RENAME TO packages;

-- Rename the index
ALTER INDEX IF EXISTS idx_video_packages_teacher_id RENAME TO idx_packages_teacher_id;

-- Update the view to use the new table name
DROP VIEW IF EXISTS student_package_purchases;

CREATE OR REPLACE VIEW student_package_purchases AS
SELECT
  p.user_id AS student_id,
  p.package_id,
  pkg.teacher_id,
  pkg.name AS package_name,
  pkg.price AS package_price,
  p.paid_at
FROM purchases p
JOIN packages pkg ON p.package_id = pkg.id
WHERE p.status = 'paid';

COMMENT ON VIEW student_package_purchases IS 'Provides a quick way to see which students have successfully purchased which packages.';
