-- Photo uploads system with approval workflow
-- Students can upload photos that require teacher approval

CREATE TABLE IF NOT EXISTS photo_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  upload_type TEXT NOT NULL DEFAULT 'gallery' CHECK (upload_type IN ('gallery', 'chat')),
  rejection_reason TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_photo_uploads_student ON photo_uploads(student_id);
CREATE INDEX IF NOT EXISTS idx_photo_uploads_teacher ON photo_uploads(teacher_id);
CREATE INDEX IF NOT EXISTS idx_photo_uploads_status ON photo_uploads(status);
CREATE INDEX IF NOT EXISTS idx_photo_uploads_created ON photo_uploads(created_at DESC);

-- Photo upload notifications
CREATE TABLE IF NOT EXISTS photo_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photo_uploads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('upload_pending', 'approved', 'rejected')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photo_notifications_user ON photo_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_photo_notifications_photo ON photo_notifications(photo_id);

-- Comments on photos (optional for future)
CREATE TABLE IF NOT EXISTS photo_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photo_uploads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photo_comments_photo ON photo_comments(photo_id);
