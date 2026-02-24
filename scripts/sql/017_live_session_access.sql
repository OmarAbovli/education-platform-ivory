-- Add access control columns to live_sessions table
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS grades INT[];
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS month INT CHECK (month BETWEEN 1 AND 12);
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE;
