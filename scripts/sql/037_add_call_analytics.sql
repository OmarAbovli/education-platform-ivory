
-- Add analytics columns to voice_call_participants
ALTER TABLE voice_call_participants
ADD COLUMN IF NOT EXISTS speaking_duration_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mic_open_duration_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS join_count INTEGER DEFAULT 1;

-- Ensure we can store detailed event logs if needed in future (optional, but good for "who spoke when")
-- For now, aggregate totals are enough for the requirement "who spoke and for how long".
