-- Add category to videos table to allow filtering
ALTER TABLE videos ADD COLUMN IF NOT EXISTS category TEXT;
