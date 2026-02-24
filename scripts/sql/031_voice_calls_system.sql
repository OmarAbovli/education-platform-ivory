-- Voice calls system for Community Chat
-- Allows students and teachers to start and join group voice calls per grade

CREATE TABLE IF NOT EXISTS voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 3),
  started_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL UNIQUE,
  room_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  max_participants INTEGER DEFAULT 50,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Participants in voice calls
CREATE TABLE IF NOT EXISTS voice_call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES voice_calls(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(call_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voice_calls_grade ON voice_calls(grade, status);
CREATE INDEX IF NOT EXISTS idx_voice_calls_status ON voice_calls(status);
CREATE INDEX IF NOT EXISTS idx_voice_call_participants_call ON voice_call_participants(call_id);
CREATE INDEX IF NOT EXISTS idx_voice_call_participants_user ON voice_call_participants(user_id);
