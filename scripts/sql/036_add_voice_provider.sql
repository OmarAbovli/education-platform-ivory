-- Add provider column to voice_calls table to distinguish between Jitsi and LiveKit
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'jitsi';
-- Add token column for LiveKit tokens (optional, as tokens are usually generated on the fly, but good to have flexibility)
-- We will store room_sid from LiveKit in room_name or room_url potentially if needed.
