-- ========================================================
-- LIVEKIT DATABASE SCHEMA FIX
-- ========================================================
-- Run this script to ensure all tables and columns needed
-- for session recording and attendance are present.

-- 1. Table for tracking live status per teacher
CREATE TABLE IF NOT EXISTS teacher_live_status (
  teacher_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to teacher_live_status
ALTER TABLE teacher_live_status ADD COLUMN IF NOT EXISTS grades INT[];
ALTER TABLE teacher_live_status ADD COLUMN IF NOT EXISTS package_ids UUID[];

-- 2. Table for recording voice/video calls
CREATE TABLE IF NOT EXISTS voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade INTEGER NOT NULL CHECK (grade BETWEEN 0 AND 3),
  started_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL UNIQUE,
  room_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  max_participants INTEGER DEFAULT 50,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Add missing columns to voice_calls
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'jitsi';
ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS recording_url TEXT;

-- 3. Table for tracking call participants (Attendance)
CREATE TABLE IF NOT EXISTS voice_call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES voice_calls(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(call_id, user_id)
);

-- Add missing analytics columns to voice_call_participants
ALTER TABLE voice_call_participants ADD COLUMN IF NOT EXISTS speaking_duration_seconds INTEGER DEFAULT 0;
ALTER TABLE voice_call_participants ADD COLUMN IF NOT EXISTS mic_open_duration_seconds INTEGER DEFAULT 0;
ALTER TABLE voice_call_participants ADD COLUMN IF NOT EXISTS join_count INTEGER DEFAULT 1;
ALTER TABLE voice_call_participants ADD COLUMN IF NOT EXISTS hand_raise_count INTEGER DEFAULT 0;

-- 4. Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_calls_grade ON voice_calls(grade, status);
CREATE INDEX IF NOT EXISTS idx_voice_calls_status ON voice_calls(status);
CREATE INDEX IF NOT EXISTS idx_voice_call_participants_call ON voice_call_participants(call_id);
CREATE INDEX IF NOT EXISTS idx_voice_call_participants_user ON voice_call_participants(user_id);

-- Success Message
DO $$
BEGIN
    RAISE NOTICE ' LiveKit Database Schema Fixed Successfully';
END $$;
