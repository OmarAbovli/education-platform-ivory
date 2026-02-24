-- ================================================
-- Package Codes System (نظام أكواد الباقات)
-- ================================================
-- This migration creates the infrastructure for teachers to generate
-- access codes for packages, and for students to redeem them.

-- IMPORTANT: This migration assumes the 'packages' table exists.
-- The packages table comes from migration 026_packages_system.sql
-- If you don't have it, first create it or rename video_packages to packages:
-- ALTER TABLE video_packages RENAME TO packages;

-- Create package_codes table
CREATE TABLE IF NOT EXISTS package_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- الكود الفريد
  code TEXT UNIQUE NOT NULL,
  
  -- معلومات الباقة والصف
  package_id TEXT NOT NULL,  -- Changed to TEXT to match packages.id if TEXT, or keep UUID if packages uses UUID
  grade INTEGER NOT NULL CHECK (grade IN (1, 2, 3)),
  
  -- المدرس الذي أنشأ الكود
  teacher_id TEXT NOT NULL,
  
  -- حالة الاستخدام
  is_used BOOLEAN DEFAULT FALSE,
  used_by_student_id TEXT,
  used_at TIMESTAMP,
  
  -- معلومات إضافية
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  -- Foreign keys - commented until we verify table structure
  -- Uncomment after verifying your packages table structure
  -- CONSTRAINT fk_package FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
  CONSTRAINT fk_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_student FOREIGN KEY (used_by_student_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_package_codes_code ON package_codes(code);
CREATE INDEX IF NOT EXISTS idx_package_codes_package ON package_codes(package_id);
CREATE INDEX IF NOT EXISTS idx_package_codes_teacher ON package_codes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_package_codes_used ON package_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_package_codes_student ON package_codes(used_by_student_id);

-- Add comments for documentation
COMMENT ON TABLE package_codes IS 'Stores unique access codes for packages that can be redeemed by students';
COMMENT ON COLUMN package_codes.code IS 'Unique access code in format: COMP-XXXX-XXXX-XXXX';
COMMENT ON COLUMN package_codes.is_used IS 'Whether this code has been redeemed';
COMMENT ON COLUMN package_codes.expires_at IS 'Optional expiration date for the code';
