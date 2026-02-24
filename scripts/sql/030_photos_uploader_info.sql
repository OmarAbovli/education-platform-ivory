-- Add uploader information to photos table
-- This allows photos uploaded by students (and approved by teachers) to show the student's name

ALTER TABLE photos ADD COLUMN IF NOT EXISTS uploader_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS uploader_name TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_photos_uploader ON photos(uploader_id);
