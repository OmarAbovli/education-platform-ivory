-- 032_video_watch_tracking.sql
-- نظام تتبع مشاهدات الفيديو مع حد أقصى 3 مشاهدات لكل فيديو

-- جدول لتتبع مشاهدات الفيديو
CREATE TABLE IF NOT EXISTS video_watch_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  watch_count INTEGER NOT NULL DEFAULT 0,
  last_watch_progress DECIMAL(5,2) DEFAULT 0, -- النسبة المئوية للتقدم (0-100)
  last_watched_at TIMESTAMP WITH TIME ZONE,
  completed_count INTEGER NOT NULL DEFAULT 0, -- عدد المرات التي شاهد فيها 85% أو أكثر
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, video_id)
);

-- جدول لتتبع جلسات المشاهدة التفصيلية
CREATE TABLE IF NOT EXISTS video_watch_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_end TIMESTAMP WITH TIME ZONE,
  max_progress DECIMAL(5,2) DEFAULT 0, -- أقصى تقدم في هذه الجلسة
  is_completed BOOLEAN DEFAULT FALSE, -- هل وصل إلى 85% في هذه الجلسة
  duration_seconds INTEGER DEFAULT 0, -- مدة المشاهدة بالثواني
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إضافة حقل للحد الأقصى للمشاهدات (يمكن تخصيصه لكل فيديو)
ALTER TABLE videos ADD COLUMN IF NOT EXISTS max_watch_count INTEGER DEFAULT 3;

-- إضافة حقل لتفعيل/تعطيل حد المشاهدات
ALTER TABLE videos ADD COLUMN IF NOT EXISTS watch_limit_enabled BOOLEAN DEFAULT TRUE;

-- فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_video_watch_tracking_student ON video_watch_tracking(student_id);
CREATE INDEX IF NOT EXISTS idx_video_watch_tracking_video ON video_watch_tracking(video_id);
CREATE INDEX IF NOT EXISTS idx_video_watch_sessions_student ON video_watch_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_video_watch_sessions_video ON video_watch_sessions(video_id);

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_video_watch_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث updated_at
CREATE OR REPLACE TRIGGER trigger_update_video_watch_tracking_updated_at
BEFORE UPDATE ON video_watch_tracking
FOR EACH ROW
EXECUTE FUNCTION update_video_watch_tracking_updated_at();

-- View لعرض معلومات المشاهدة مع عدد المرات المتبقية
CREATE OR REPLACE VIEW student_video_watch_info AS
SELECT 
  vwt.student_id,
  vwt.video_id,
  v.title as video_title,
  vwt.completed_count as times_watched,
  COALESCE(v.max_watch_count, 3) as max_allowed,
  GREATEST(0, COALESCE(v.max_watch_count, 3) - vwt.completed_count) as remaining_watches,
  vwt.last_watch_progress,
  vwt.last_watched_at,
  v.watch_limit_enabled,
  CASE 
    WHEN NOT v.watch_limit_enabled THEN TRUE
    WHEN vwt.completed_count < COALESCE(v.max_watch_count, 3) THEN TRUE
    ELSE FALSE
  END as can_watch
FROM video_watch_tracking vwt
JOIN videos v ON v.id = vwt.video_id;

COMMENT ON VIEW student_video_watch_info IS 'معلومات مشاهدة الفيديو للطلاب مع عدد المرات المتبقية';
