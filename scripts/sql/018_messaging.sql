-- Tables for the student-teacher messaging system

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending_teacher_reply', 'pending_student_reply')),
  student_has_unread BOOLEAN NOT NULL DEFAULT FALSE,
  teacher_has_unread BOOLEAN NOT NULL DEFAULT TRUE, -- Default to true so teacher sees the first message
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Ensures only one conversation thread per student-teacher pair for simplicity
  UNIQUE(student_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to update the conversation's updated_at timestamp on new message
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    updated_at = NOW(),
    -- Set unread status for the recipient
    student_has_unread = CASE WHEN (SELECT role FROM users WHERE id = NEW.sender_id) = 'teacher' THEN TRUE ELSE student_has_unread END,
    teacher_has_unread = CASE WHEN (SELECT role FROM users WHERE id = NEW.sender_id) = 'student' THEN TRUE ELSE teacher_has_unread END,
    -- Update status based on who sent the last message
    status = CASE 
               WHEN (SELECT role FROM users WHERE id = NEW.sender_id) = 'student' THEN 'pending_teacher_reply'
               WHEN (SELECT role FROM users WHERE id = NEW.sender_id) = 'teacher' THEN 'pending_student_reply'
               ELSE status 
             END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_conversation_on_new_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_updated_at();


-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_student_id ON conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_conversations_teacher_id ON conversations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
