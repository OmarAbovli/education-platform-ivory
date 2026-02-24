-- ============================================================
-- Fix: Update teacher's Bunny CDN hostname so HLS URLs are correct
-- The correct CDN hostname for this library is: vz-c5b33ef7-9f5.b-cdn.net
-- ============================================================

-- Step 1: Run migration to add column (if not already done via 041_add_bunny_cdn_hostname.sql)
ALTER TABLE users ADD COLUMN IF NOT EXISTS bunny_cdn_hostname TEXT;

-- Step 2: Update the teacher's CDN hostname
-- Replace 't_your_teacher_id' with the actual teacher user ID
-- OR run without a WHERE clause to update all teachers (if there is only one)
UPDATE users 
SET bunny_cdn_hostname = 'vz-c5b33ef7-9f5.b-cdn.net'
WHERE role = 'teacher';

-- Verify
SELECT id, name, bunny_library_id, bunny_cdn_hostname FROM users WHERE role = 'teacher';
