-- ========================================================
-- FINAL CONSOLIDATED FIX
-- 1. Fix photo system (uploader_id, photo_uploads, etc.)
-- 2. Update branding (Teacher Profile Photo)
-- ========================================================

BEGIN;

-- Part A: Photos System Fixes
-- --------------------------------------------------------
ALTER TABLE photos ADD COLUMN IF NOT EXISTS uploader_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS uploader_name TEXT;

CREATE INDEX IF NOT EXISTS idx_photos_uploader ON photos(uploader_id);

CREATE TABLE IF NOT EXISTS photo_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  upload_type TEXT NOT NULL DEFAULT 'gallery' CHECK (upload_type IN ('gallery', 'chat')),
  rejection_reason TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photo_uploads_status ON photo_uploads(status);
CREATE INDEX IF NOT EXISTS idx_photo_uploads_teacher ON photo_uploads(teacher_id);

CREATE TABLE IF NOT EXISTS photo_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photo_uploads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('upload_pending', 'approved', 'rejected')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Part B: User & System Fixes
-- --------------------------------------------------------
-- Fix student classification column
ALTER TABLE users ADD COLUMN IF NOT EXISTS classification TEXT CHECK (classification IN ('center', 'online')) DEFAULT 'center';
UPDATE users SET classification = 'center' WHERE role = 'student' AND classification IS NULL;

-- Update all teacher accounts to use the new premium portrait
UPDATE users 
SET avatar_url = '/teatcher.jpg' 
WHERE role = 'teacher';

COMMIT;
