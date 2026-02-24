-- ========================================================
-- YOURPLATFORM COMPLETE DATABASE SCHEMA
-- Consolidated from all migration files
-- ========================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================================
-- 1. CORE & AUTHENTICATION
-- ========================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin','teacher','student')),
  name TEXT,
  username TEXT UNIQUE,
  password_hash TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  guardian_phone TEXT,
  grade INT CHECK (grade IN (1,2,3)),
  
  -- Teacher Profile Fields
  bio TEXT,
  subject TEXT,
  avatar_url TEXT,
  theme_primary TEXT,
  theme_secondary TEXT,
  
  -- Bunny.net Video Hosting Config (per teacher)
  bunny_main_api_key TEXT,
  bunny_api_key TEXT,
  bunny_library_id TEXT,
  
  -- Gamification & Activity
  xp BIGINT DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_count INTEGER DEFAULT 0,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- UI Settings
  snow_enabled BOOLEAN DEFAULT TRUE,
  classification TEXT DEFAULT 'center' CHECK (classification IN ('center', 'online')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS qr_tokens (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  usage_limit INTEGER DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  is_permanent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================================
-- 2. CONTENT & PACKAGES
-- ========================================================

CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0, -- Price in cents
  thumbnail_url TEXT,
  grades INT[], -- Array of grades (1, 2, 3)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  grades INT[] NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT,
  is_free BOOLEAN DEFAULT FALSE,
  month INT CHECK (month BETWEEN 1 AND 12),
  duration_seconds INTEGER DEFAULT 0,
  max_watch_count INTEGER DEFAULT 3,
  watch_limit_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  uploader_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  uploader_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS photo_likes (
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (photo_id, user_id)
);

CREATE TABLE IF NOT EXISTS photo_comments (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_comments (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS photo_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photo_uploads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('upload_pending', 'approved', 'rejected')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================================
-- 3. ACADEMICS & EXAMS
-- ========================================================

-- Native Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT REFERENCES videos(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  quiz_type TEXT NOT NULL CHECK (quiz_type IN ('native', 'external')),
  external_url TEXT,
  time_limit_minutes INT,
  passing_score INT CHECK (passing_score BETWEEN 0 AND 100),
  allow_multiple_attempts BOOLEAN DEFAULT FALSE,
  shuffle_questions BOOLEAN DEFAULT FALSE,
  shuffle_options BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  "order" INT NOT NULL,
  feedback TEXT
);

CREATE TABLE IF NOT EXISTS quiz_submissions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_answers (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES quiz_submissions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_index INT,
  is_correct BOOLEAN NOT NULL
);

-- Live Exams (Anti-Cheat)
CREATE TABLE IF NOT EXISTS live_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  grade INTEGER NOT NULL CHECK (grade IN (1, 2, 3)),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  scheduled_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  passing_score INTEGER NOT NULL CHECK (passing_score >= 0 AND passing_score <= 100),
  shuffle_questions BOOLEAN DEFAULT TRUE,
  shuffle_choices BOOLEAN DEFAULT TRUE,
  allow_retry BOOLEAN DEFAULT TRUE,
  max_attempts INTEGER DEFAULT NULL,
  show_correct_answers BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES live_exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  points INTEGER DEFAULT 1 CHECK (points > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  choice_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  choice_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES live_exams(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  score INTEGER,
  total_points INTEGER,
  percentage DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'kicked_out', 'expired')),
  questions_shuffled_order JSONB,
  is_flagged BOOLEAN DEFAULT FALSE,
  violation_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, student_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  choice_id UUID REFERENCES question_choices(id) ON DELETE SET NULL,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS exam_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  violation_type VARCHAR(100) NOT NULL CHECK (violation_type IN (
    'tab_switch', 'window_blur', 'context_menu', 'copy_paste',
    'fullscreen_exit', 'developer_tools', 'suspicious_activity'
  )),
  violation_details JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- 4. SOCIAL & COMMUNICATION
-- ========================================================

-- Live Video Rooms
CREATE TABLE IF NOT EXISTS live_sessions (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  embed_url TEXT NOT NULL,
  grades INT[],
  month INT,
  is_free BOOLEAN DEFAULT FALSE,
  package_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher Live Status
CREATE TABLE IF NOT EXISTS teacher_live_status (
  teacher_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  grades INT[],
  package_ids UUID[],
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voice Calls
CREATE TABLE IF NOT EXISTS voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade INTEGER NOT NULL CHECK (grade BETWEEN 0 AND 3),
  started_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL UNIQUE,
  room_url TEXT NOT NULL,
  provider TEXT DEFAULT 'jitsi',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  max_participants INTEGER DEFAULT 50,
  recording_url TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS voice_call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES voice_calls(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  speaking_duration_seconds INTEGER DEFAULT 0,
  mic_open_duration_seconds INTEGER DEFAULT 0,
  join_count INTEGER DEFAULT 1,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(call_id, user_id)
);

-- Messaging
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending_teacher_reply', 'pending_student_reply')),
  student_has_unread BOOLEAN NOT NULL DEFAULT FALSE,
  teacher_has_unread BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Group Chat
CREATE TABLE IF NOT EXISTS group_messages (
  id TEXT PRIMARY KEY,
  grade INTEGER NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================================
-- 5. ACCESS, PURCHASES & CODES
-- ========================================================

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_token TEXT UNIQUE,
  user_id TEXT,
  package_id UUID REFERENCES packages(id),
  paymob_order_id TEXT,
  payment_token TEXT,
  amount_cents INTEGER,
  currency TEXT,
  months_count INTEGER,
  months_list TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  parent_phone TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS student_package_access (
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by TEXT,
  PRIMARY KEY (student_id, teacher_id, package_id)
);

CREATE TABLE IF NOT EXISTS package_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  grade INTEGER NOT NULL CHECK (grade IN (1, 2, 3)),
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_used BOOLEAN DEFAULT FALSE,
  used_by_student_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teacher_subscriptions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active','canceled','past_due')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ends_at TIMESTAMP WITH TIME ZONE
);

-- ========================================================
-- 6. TRACKING & GAMIFICATION
-- ========================================================

-- Video Watch Tracking
CREATE TABLE IF NOT EXISTS video_watch_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  watch_count INTEGER NOT NULL DEFAULT 0,
  last_watch_progress DECIMAL(5,2) DEFAULT 0,
  last_watched_at TIMESTAMP WITH TIME ZONE,
  completed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, video_id)
);

CREATE TABLE IF NOT EXISTS video_watch_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_end TIMESTAMP WITH TIME ZONE,
  max_progress DECIMAL(5,2) DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Practice Sessions
CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  topic TEXT,
  mode TEXT DEFAULT 'chat' CHECK (mode IN ('chat', 'voice')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  total_messages INTEGER DEFAULT 0,
  grammar_score INTEGER,
  vocabulary_score INTEGER,
  fluency_score INTEGER,
  overall_score INTEGER,
  strengths TEXT[],
  weaknesses TEXT[],
  suggestions TEXT[],
  common_mistakes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS practice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'ai')),
  content TEXT NOT NULL,
  has_grammar_errors BOOLEAN DEFAULT FALSE,
  grammar_corrections JSONB,
  vocabulary_suggestions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS practice_stats (
  student_id TEXT PRIMARY KEY,
  total_sessions INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  avg_grammar_score DECIMAL(5,2),
  avg_vocabulary_score DECIMAL(5,2),
  avg_fluency_score DECIMAL(5,2),
  avg_overall_score DECIMAL(5,2),
  improvement_rate DECIMAL(5,2),
  streak_days INTEGER DEFAULT 0,
  last_practice_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- XP and Achievements
CREATE TABLE IF NOT EXISTS xp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  xp_reward INTEGER DEFAULT 0,
  requirement_type TEXT,
  requirement_value INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, achievement_id)
);

-- ========================================================
-- 7. INDEXES
-- ========================================================

CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_token ON qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_packages_teacher_id ON packages(teacher_id);
CREATE INDEX IF NOT EXISTS idx_videos_teacher ON videos(teacher_id);
CREATE INDEX IF NOT EXISTS idx_videos_package ON videos(package_id);
CREATE INDEX IF NOT EXISTS idx_videos_grades ON videos USING GIN (grades);
CREATE INDEX IF NOT EXISTS idx_videos_is_free ON videos(is_free);
CREATE INDEX IF NOT EXISTS idx_resources_video_id ON resources(video_id);
CREATE INDEX IF NOT EXISTS idx_photos_teacher_id ON photos(teacher_id);
CREATE INDEX IF NOT EXISTS idx_photo_likes_user_id ON photo_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_video_id ON quizzes(video_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_live_exams_scheduled ON live_exams(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student ON exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_grade ON voice_calls(grade, status);
CREATE INDEX IF NOT EXISTS idx_conversations_student ON conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_grade ON group_messages (grade, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases (status);
CREATE INDEX IF NOT EXISTS idx_video_watch_tracking_student ON video_watch_tracking(student_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_student ON practice_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_xp_logs_user ON xp_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_video_id ON video_comments(video_id);

-- ========================================================
-- 8. VIEWS
-- ========================================================

CREATE OR REPLACE VIEW student_package_purchases AS
SELECT
  p.user_id AS student_id,
  p.package_id,
  pkg.teacher_id,
  pkg.name AS package_name,
  pkg.price AS package_price,
  p.paid_at
FROM purchases p
JOIN packages pkg ON p.package_id = pkg.id
WHERE p.status = 'paid';

CREATE OR REPLACE VIEW exam_overview AS
SELECT 
  e.id AS exam_id, e.title, e.grade, e.scheduled_at, e.ends_at, e.duration_minutes,
  COUNT(DISTINCT a.student_id) FILTER (WHERE a.started_at IS NOT NULL) AS students_started,
  COUNT(DISTINCT a.student_id) FILTER (WHERE a.status = 'submitted') AS students_completed,
  COUNT(DISTINCT a.student_id) FILTER (WHERE a.is_flagged = TRUE) AS students_flagged,
  AVG(a.percentage) FILTER (WHERE a.status = 'submitted') AS avg_score
FROM live_exams e
LEFT JOIN exam_attempts a ON e.id = a.exam_id
GROUP BY e.id;

CREATE OR REPLACE VIEW student_video_watch_info AS
SELECT 
  vwt.student_id, vwt.video_id, v.title as video_title, vwt.completed_count as times_watched,
  COALESCE(v.max_watch_count, 3) as max_allowed,
  GREATEST(0, COALESCE(v.max_watch_count, 3) - vwt.completed_count) as remaining_watches,
  vwt.last_watch_progress, vwt.last_watched_at, v.watch_limit_enabled,
  CASE 
    WHEN NOT v.watch_limit_enabled THEN TRUE
    WHEN vwt.completed_count < COALESCE(v.max_watch_count, 3) THEN TRUE
    ELSE FALSE
  END as can_watch
FROM video_watch_tracking vwt
JOIN videos v ON v.id = vwt.video_id;

-- ========================================================
-- 9. FUNCTIONS & TRIGGERS
-- ========================================================

-- Messaging updated_at
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW(),
    student_has_unread = CASE WHEN (SELECT role FROM users WHERE id = NEW.sender_id) = 'teacher' THEN TRUE ELSE student_has_unread END,
    teacher_has_unread = CASE WHEN (SELECT role FROM users WHERE id = NEW.sender_id) = 'student' THEN TRUE ELSE teacher_has_unread END,
    status = CASE WHEN (SELECT role FROM users WHERE id = NEW.sender_id) = 'student' THEN 'pending_teacher_reply'
                  WHEN (SELECT role FROM users WHERE id = NEW.sender_id) = 'teacher' THEN 'pending_student_reply' ELSE status END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_conversation_on_new_message AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION update_conversation_updated_at();

-- Video Watch Timestamp
CREATE OR REPLACE FUNCTION update_video_watch_tracking_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER trigger_update_video_watch_tracking_updated_at BEFORE UPDATE ON video_watch_tracking FOR EACH ROW EXECUTE FUNCTION update_video_watch_tracking_updated_at();

-- Practice Stats Updated At
CREATE OR REPLACE FUNCTION update_practice_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER update_practice_sessions_updated_at BEFORE UPDATE ON practice_sessions FOR EACH ROW EXECUTE FUNCTION update_practice_updated_at();
CREATE TRIGGER update_practice_stats_updated_at BEFORE UPDATE ON practice_stats FOR EACH ROW EXECUTE FUNCTION update_practice_updated_at();

-- XP & Leveling
CREATE OR REPLACE FUNCTION update_user_level() RETURNS TRIGGER AS $$ 
DECLARE new_level INTEGER;
BEGIN
    new_level := floor(sqrt(NEW.xp / 100.0)) + 1;
    IF new_level != NEW.level THEN NEW.level := new_level; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER trigger_update_user_level BEFORE UPDATE OF xp ON users FOR EACH ROW EXECUTE FUNCTION update_user_level();

-- Practice Stats Completion Logic (Summary)
CREATE OR REPLACE FUNCTION update_practice_stats_on_session_complete() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO practice_stats (student_id, total_sessions, total_messages, total_duration_minutes, avg_grammar_score, avg_vocabulary_score, avg_fluency_score, avg_overall_score, last_practice_date)
    VALUES (NEW.student_id, 1, NEW.total_messages, COALESCE(NEW.duration_seconds, 0) / 60, NEW.grammar_score, NEW.vocabulary_score, NEW.fluency_score, NEW.overall_score, CURRENT_DATE)
    ON CONFLICT (student_id) DO UPDATE SET
      total_sessions = practice_stats.total_sessions + 1,
      total_messages = practice_stats.total_messages + NEW.total_messages,
      total_duration_minutes = practice_stats.total_duration_minutes + (COALESCE(NEW.duration_seconds, 0) / 60),
      avg_grammar_score = ((practice_stats.avg_grammar_score * practice_stats.total_sessions + NEW.grammar_score) / (practice_stats.total_sessions + 1)),
      avg_vocabulary_score = ((practice_stats.avg_vocabulary_score * practice_stats.total_sessions + NEW.vocabulary_score) / (practice_stats.total_sessions + 1)),
      avg_fluency_score = ((practice_stats.avg_fluency_score * practice_stats.total_sessions + NEW.fluency_score) / (practice_stats.total_sessions + 1)),
      avg_overall_score = ((practice_stats.avg_overall_score * practice_stats.total_sessions + NEW.overall_score) / (practice_stats.total_sessions + 1)),
      streak_days = CASE WHEN practice_stats.last_practice_date = CURRENT_DATE - INTERVAL '1 day' THEN practice_stats.streak_days + 1
                         WHEN practice_stats.last_practice_date = CURRENT_DATE THEN practice_stats.streak_days ELSE 1 END,
      last_practice_date = CURRENT_DATE, updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER update_stats_on_session_complete AFTER UPDATE ON practice_sessions FOR EACH ROW EXECUTE FUNCTION update_practice_stats_on_session_complete();

-- ========================================================
-- 10. INITIAL ADMIN SEED
-- ========================================================

INSERT INTO users (id, role, name, email, username, password_hash)
VALUES ('ad_super', 'admin', 'Super Admin', 'admin@yourplatform.local', 'superadmin', '321321')
ON CONFLICT (id) DO NOTHING;

INSERT INTO achievements (title, description, xp_reward, requirement_type, requirement_value)
VALUES 
  ('Night Owl', 'شاهد 5 فيديوهات بعد منتصف الليل', 250, 'night_videos', 5),
  ('Live Legend', 'حضر 10 حصص لايف كاملة', 500, 'live_count', 10),
  ('Perfectionist', 'حصل على 100% في 3 اختبارات متتالية', 1000, 'perfect_exams', 3),
  ('Fast Learner', 'أكمل أول باكدج له بالكامل', 300, 'package_complete', 1)
ON CONFLICT DO NOTHING;
