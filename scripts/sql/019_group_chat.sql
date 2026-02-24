-- 019_group_chat.sql
-- Simple group chat messages table for per-grade community chats

CREATE TABLE IF NOT EXISTS group_messages (
  id TEXT PRIMARY KEY,
  grade INTEGER NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_messages_grade_created_at ON group_messages (grade, created_at DESC);
