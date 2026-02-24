-- Live Exams System Schema
-- نظام الاختبارات المباشرة مع Anti-Cheating

-- جدول الاختبارات اللايف
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
  max_attempts INTEGER DEFAULT NULL, -- NULL means unlimited retries
  show_correct_answers BOOLEAN DEFAULT FALSE, -- show answers after exam
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول أسئلة الاختبار
CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES live_exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  points INTEGER DEFAULT 1 CHECK (points > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول اختيارات الأسئلة
CREATE TABLE IF NOT EXISTS question_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  choice_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  choice_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول محاولات الطلاب
CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES live_exams(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ, -- when they left or were kicked
  score INTEGER, -- calculated score
  total_points INTEGER, -- total possible points
  percentage DECIMAL(5,2), -- score percentage
  status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'kicked_out', 'expired')),
  questions_shuffled_order JSONB, -- store the shuffled question order for this attempt
  is_flagged BOOLEAN DEFAULT FALSE, -- flagged for suspicious activity
  violation_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, student_id, attempt_number)
);

-- جدول إجابات الطلاب
CREATE TABLE IF NOT EXISTS exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  choice_id UUID REFERENCES question_choices(id) ON DELETE SET NULL,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

-- جدول مخالفات الغش
CREATE TABLE IF NOT EXISTS exam_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  violation_type VARCHAR(100) NOT NULL CHECK (violation_type IN (
    'tab_switch',
    'window_blur',
    'context_menu',
    'copy_paste',
    'fullscreen_exit',
    'developer_tools',
    'suspicious_activity'
  )),
  violation_details JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_exams_teacher ON live_exams(teacher_id);
CREATE INDEX IF NOT EXISTS idx_live_exams_grade ON live_exams(grade);
CREATE INDEX IF NOT EXISTS idx_live_exams_scheduled ON live_exams(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_question_choices_question ON question_choices(question_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student ON exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_status ON exam_attempts(status);
CREATE INDEX IF NOT EXISTS idx_exam_answers_attempt ON exam_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_violations_attempt ON exam_violations(attempt_id);

-- View for teacher dashboard - exam overview
CREATE OR REPLACE VIEW exam_overview AS
SELECT 
  e.id AS exam_id,
  e.title,
  e.grade,
  e.scheduled_at,
  e.ends_at,
  e.duration_minutes,
  COUNT(DISTINCT a.student_id) FILTER (WHERE a.started_at IS NOT NULL) AS students_started,
  COUNT(DISTINCT a.student_id) FILTER (WHERE a.status = 'submitted') AS students_completed,
  COUNT(DISTINCT a.student_id) FILTER (WHERE a.is_flagged = TRUE) AS students_flagged,
  AVG(a.percentage) FILTER (WHERE a.status = 'submitted') AS avg_score
FROM live_exams e
LEFT JOIN exam_attempts a ON e.id = a.exam_id
GROUP BY e.id;

-- View for student exam history
CREATE OR REPLACE VIEW student_exam_history AS
SELECT 
  a.student_id,
  a.exam_id,
  e.title AS exam_title,
  e.scheduled_at,
  a.attempt_number,
  a.started_at,
  a.submitted_at,
  a.score,
  a.total_points,
  a.percentage,
  a.status,
  a.is_flagged,
  a.violation_count,
  COUNT(v.id) AS total_violations
FROM exam_attempts a
JOIN live_exams e ON a.exam_id = e.id
LEFT JOIN exam_violations v ON a.id = v.attempt_id
GROUP BY a.id, a.student_id, a.exam_id, e.title, e.scheduled_at, 
         a.attempt_number, a.started_at, a.submitted_at, a.score, 
         a.total_points, a.percentage, a.status, a.is_flagged, a.violation_count;
