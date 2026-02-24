-- إضافة حقل مدة الفيديو لحفظ واستعادة موضع المشاهدة
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;

-- إضافة فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_video_watch_sessions_incomplete 
ON video_watch_sessions(student_id, video_id, is_completed) 
WHERE is_completed = false;

-- إضافة فهرس لآخر جلسات المشاهدة
CREATE INDEX IF NOT EXISTS idx_video_watch_sessions_latest 
ON video_watch_sessions(student_id, video_id, created_at DESC);

COMMENT ON COLUMN videos.duration_seconds IS 'مدة الفيديو بالثواني لحساب موضع المشاهدة';
