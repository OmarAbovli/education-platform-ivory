-- ============================================
-- COMPREHENSIVE FIX FOR PACKAGE CODES SYSTEM
-- ============================================
-- Run this file to fix all database issues

-- Step 1: Check if video_packages exists and rename it to packages
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'video_packages') THEN
        -- Rename table
        ALTER TABLE video_packages RENAME TO packages;
        
        -- Rename index
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_video_packages_teacher_id') THEN
            ALTER INDEX idx_video_packages_teacher_id RENAME TO idx_packages_teacher_id;
        END IF;
        
        RAISE NOTICE 'Renamed video_packages to packages';
    ELSE
        RAISE NOTICE 'video_packages table does not exist or already renamed';
    END IF;
END $$;

-- Step 2: If packages table doesn't exist at all, create it
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0, -- Price in cents
  thumbnail_url TEXT,
  grade INTEGER, -- Add grade column if needed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_teacher_id ON packages(teacher_id);

-- Step 3: Create student_package_access table (for manual access grants and code redemptions)
CREATE TABLE IF NOT EXISTS student_package_access (
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by TEXT,
  PRIMARY KEY (student_id, teacher_id, package_id)
);

CREATE INDEX IF NOT EXISTS idx_student_package_access_student ON student_package_access(student_id);
CREATE INDEX IF NOT EXISTS idx_student_package_access_package ON student_package_access(package_id);
CREATE INDEX IF NOT EXISTS idx_student_package_access_teacher ON student_package_access(teacher_id);

-- Step 4: Create package_codes table
CREATE TABLE IF NOT EXISTS package_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- الكود الفريد
  code TEXT UNIQUE NOT NULL,
  
  -- معلومات الباقة والصف
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  grade INTEGER NOT NULL CHECK (grade IN (1, 2, 3)),
  
  -- المدرس الذي أنشأ الكود
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- حالة الاستخدام
  is_used BOOLEAN DEFAULT FALSE,
  used_by_student_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMP,
  
  -- معلومات إضافية
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_package_codes_code ON package_codes(code);
CREATE INDEX IF NOT EXISTS idx_package_codes_package ON package_codes(package_id);
CREATE INDEX IF NOT EXISTS idx_package_codes_teacher ON package_codes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_package_codes_used ON package_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_package_codes_student ON package_codes(used_by_student_id);

-- Step 5: Update or create the view
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

-- Add comments
COMMENT ON TABLE package_codes IS 'Stores unique access codes for packages that can be redeemed by students';
COMMENT ON COLUMN package_codes.code IS 'Unique access code in format: COMP-XXXX-XXXX-XXXX';
COMMENT ON COLUMN package_codes.is_used IS 'Whether this code has been redeemed';
COMMENT ON COLUMN package_codes.expires_at IS 'Optional expiration date for the code';

-- Step 6: Fix package_id type in package_codes if needed
DO $$
BEGIN
    -- Check if package_id is TEXT instead of UUID and fix it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'package_codes' 
        AND column_name = 'package_id' 
        AND data_type = 'text'
    ) THEN
        -- Drop constraint if exists
        ALTER TABLE package_codes DROP CONSTRAINT IF EXISTS fk_package;
        
        -- Change column type
        ALTER TABLE package_codes ALTER COLUMN package_id TYPE UUID USING package_id::uuid;
        
        -- Re-add constraint
        ALTER TABLE package_codes ADD CONSTRAINT fk_package 
            FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE;
            
        RAISE NOTICE 'Fixed package_id column type from TEXT to UUID';
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Database setup complete! Package codes system is ready to use.';
END $$;
