-- Live status per teacher (simple on/off with arbitrary URL like Zoom, YouTube, etc.)
CREATE TABLE IF NOT EXISTS teacher_live_status (
  teacher_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
