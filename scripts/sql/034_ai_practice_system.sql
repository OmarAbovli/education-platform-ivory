-- AI Language Practice System
-- Created: 2025-11-23
-- Description: نظام ممارسة اللغة الإنجليزية مع الذكاء الصناعي

-- جدول جلسات الممارسة
CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  topic TEXT, -- موضوع المحادثة (Optional)
  mode TEXT DEFAULT 'chat' CHECK (mode IN ('chat', 'voice')), -- نوع الجلسة
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER, -- مدة الجلسة بالثواني
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  
  -- التقييم والتقرير
  total_messages INTEGER DEFAULT 0, -- عدد الرسائل من الطالب
  grammar_score INTEGER, -- درجة القواعد (0-100)
  vocabulary_score INTEGER, -- درجة المفردات (0-100)
  fluency_score INTEGER, -- درجة الطلاقة (0-100)
  overall_score INTEGER, -- الدرجة الإجمالية (0-100)
  
  -- ملاحظات وتحسينات
  strengths TEXT[], -- نقاط القوة
  weaknesses TEXT[], -- نقاط الضعف
  suggestions TEXT[], -- اقتراحات للتحسين
  common_mistakes JSONB, -- الأخطاء الشائعة {"mistake": "correction"}
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول الرسائل في كل جلسة
CREATE TABLE IF NOT EXISTS practice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'ai')), -- من المتحدث
  content TEXT NOT NULL, -- نص الرسالة
  
  -- تحليل الرسالة (للرسائل من الطالب فقط)
  has_grammar_errors BOOLEAN DEFAULT FALSE,
  grammar_corrections JSONB, -- التصحيحات النحوية
  vocabulary_suggestions JSONB, -- اقتراحات مفردات أفضل
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول إحصائيات الطالب (ملخص عام)
CREATE TABLE IF NOT EXISTS practice_stats (
  student_id TEXT PRIMARY KEY,
  total_sessions INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  
  -- متوسط الدرجات
  avg_grammar_score DECIMAL(5,2),
  avg_vocabulary_score DECIMAL(5,2),
  avg_fluency_score DECIMAL(5,2),
  avg_overall_score DECIMAL(5,2),
  
  -- التحسن
  improvement_rate DECIMAL(5,2), -- نسبة التحسن %
  streak_days INTEGER DEFAULT 0, -- عدد الأيام المتتالية
  last_practice_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_practice_sessions_student ON practice_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_status ON practice_sessions(status);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_created ON practice_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_practice_messages_session ON practice_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_practice_messages_created ON practice_messages(created_at);

-- Function لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_practice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_practice_sessions_updated_at
  BEFORE UPDATE ON practice_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_practice_updated_at();

CREATE TRIGGER update_practice_stats_updated_at
  BEFORE UPDATE ON practice_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_practice_updated_at();

-- Function لحساب الدرجة الإجمالية
CREATE OR REPLACE FUNCTION calculate_overall_score(
  grammar INTEGER,
  vocabulary INTEGER,
  fluency INTEGER
)
RETURNS INTEGER AS $$
BEGIN
  -- حساب المتوسط المرجح: Grammar 40%, Vocabulary 30%, Fluency 30%
  RETURN ROUND((grammar * 0.4) + (vocabulary * 0.3) + (fluency * 0.3));
END;
$$ LANGUAGE plpgsql;

-- Function لتحديث إحصائيات الطالب عند إنهاء جلسة
CREATE OR REPLACE FUNCTION update_practice_stats_on_session_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- التحقق من أن الجلسة اكتملت
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- تحديث أو إنشاء إحصائيات الطالب
    INSERT INTO practice_stats (
      student_id,
      total_sessions,
      total_messages,
      total_duration_minutes,
      avg_grammar_score,
      avg_vocabulary_score,
      avg_fluency_score,
      avg_overall_score,
      last_practice_date
    )
    VALUES (
      NEW.student_id,
      1,
      NEW.total_messages,
      COALESCE(NEW.duration_seconds, 0) / 60,
      NEW.grammar_score,
      NEW.vocabulary_score,
      NEW.fluency_score,
      NEW.overall_score,
      CURRENT_DATE
    )
    ON CONFLICT (student_id) DO UPDATE SET
      total_sessions = practice_stats.total_sessions + 1,
      total_messages = practice_stats.total_messages + NEW.total_messages,
      total_duration_minutes = practice_stats.total_duration_minutes + (COALESCE(NEW.duration_seconds, 0) / 60),
      
      -- تحديث المتوسطات
      avg_grammar_score = (
        (practice_stats.avg_grammar_score * practice_stats.total_sessions + NEW.grammar_score) / 
        (practice_stats.total_sessions + 1)
      ),
      avg_vocabulary_score = (
        (practice_stats.avg_vocabulary_score * practice_stats.total_sessions + NEW.vocabulary_score) / 
        (practice_stats.total_sessions + 1)
      ),
      avg_fluency_score = (
        (practice_stats.avg_fluency_score * practice_stats.total_sessions + NEW.fluency_score) / 
        (practice_stats.total_sessions + 1)
      ),
      avg_overall_score = (
        (practice_stats.avg_overall_score * practice_stats.total_sessions + NEW.overall_score) / 
        (practice_stats.total_sessions + 1)
      ),
      
      -- تحديث Streak
      streak_days = CASE
        WHEN practice_stats.last_practice_date = CURRENT_DATE - INTERVAL '1 day' 
        THEN practice_stats.streak_days + 1
        WHEN practice_stats.last_practice_date = CURRENT_DATE 
        THEN practice_stats.streak_days
        ELSE 1
      END,
      
      last_practice_date = CURRENT_DATE,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث الإحصائيات تلقائياً
CREATE TRIGGER update_stats_on_session_complete
  AFTER UPDATE ON practice_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_practice_stats_on_session_complete();

-- Comments للتوثيق
COMMENT ON TABLE practice_sessions IS 'جلسات ممارسة اللغة الإنجليزية مع AI';
COMMENT ON TABLE practice_messages IS 'رسائل المحادثة في كل جلسة';
COMMENT ON TABLE practice_stats IS 'إحصائيات عامة لكل طالب';
