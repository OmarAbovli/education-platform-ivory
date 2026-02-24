-- Add per-video thumbnail URL (idempotent)
ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
