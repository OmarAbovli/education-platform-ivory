-- 036_gamification_system.sql
-- نظام التفاعل والنقاط (XP) ولوحة المتصدرين

-- 1. إضافة حقول النقاط والمستويات لجدول المستخدمين
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp BIGINT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. جدول سجلات النقاط (لتتبع العمليات ومنع التكرار)
CREATE TABLE IF NOT EXISTS xp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL, -- 'video', 'exam', 'live', 'streak', 'manual'
  source_id TEXT, -- ID of video, exam, or call
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. جدول الأوسمة والإنجازات
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  xp_reward INTEGER DEFAULT 0,
  requirement_type TEXT, -- 'videos_count', 'exams_count', 'live_minutes'
  requirement_value INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. جدول إنجازات الطلاب
CREATE TABLE IF NOT EXISTS student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, achievement_id)
);

-- 5. فهارس لتحسين أداء السيرفر في جلب لوحة المتصدرين
CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC);
CREATE INDEX IF NOT EXISTS idx_xp_logs_user ON xp_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_logs_created ON xp_logs(created_at);

-- 6. إضافة بيانات أولية للإنجازات (أمثلة)
INSERT INTO achievements (title, description, xp_reward, requirement_type, requirement_value)
VALUES 
  ('Night Owl', 'شاهد 5 فيديوهات بعد منتصف الليل', 250, 'night_videos', 5),
  ('Live Legend', 'حضر 10 حصص لايف كاملة', 500, 'live_count', 10),
  ('Perfectionist', 'حصل على 100% في 3 اختبارات متتالية', 1000, 'perfect_exams', 3),
  ('Fast Learner', 'أكمل أول باكدج له بالكامل', 300, 'package_complete', 1)
ON CONFLICT DO NOTHING;

-- 7. دالة لحساب وتحديث المستوى بناءً على النقاط
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
DECLARE
    new_level INTEGER;
BEGIN
    -- معادلة بسيطة للمستوى: level = floor(sqrt(xp / 100)) + 1
    -- تعني: 0-99 XP = Level 1, 100-399 = Level 2, 400-899 = Level 3...
    new_level := floor(sqrt(NEW.xp / 100.0)) + 1;
    
    IF new_level != NEW.level THEN
        NEW.level := new_level;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث المستوى تلقائياً عند تغير النقاط
DROP TRIGGER IF EXISTS trigger_update_user_level ON users;
CREATE TRIGGER trigger_update_user_level
BEFORE UPDATE OF xp ON users
FOR EACH ROW
EXECUTE FUNCTION update_user_level();
