-- Schema for video-centric resources and quizzes

-- Resources (e.g., PDF notes, links) associated with a video
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL, -- URL to the resource (e.g., a PDF in Vercel Blob)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resources_video_id ON resources(video_id);

-- Quizzes associated with a video or standalone
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT REFERENCES videos(id) ON DELETE SET NULL, -- Can be null if it's a general quiz
  title TEXT NOT NULL,
  quiz_type TEXT NOT NULL CHECK (quiz_type IN ('native', 'external')), -- 'native' for platform-hosted, 'external' for links
  external_url TEXT, -- For 'external' type quizzes (e.g., Google Forms)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_video_id ON quizzes(video_id);

-- Questions for native quizzes
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  -- For simplicity, we'll start with multiple choice. This can be expanded later.
  -- options format: [{ "text": "Option A", "is_correct": false }, { "text": "Option B", "is_correct": true }]
  options JSONB NOT NULL,
  "order" INT NOT NULL -- To order questions within a quiz
);

CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);

-- Records a student's attempt at a quiz
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INT, -- e.g., 80 for 80%
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quiz_id, student_id) -- A student can only have one submission per quiz
);

CREATE INDEX IF NOT EXISTS idx_submissions_quiz_id ON quiz_submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON quiz_submissions(student_id);

-- Stores the actual answers for each question in a submission
CREATE TABLE IF NOT EXISTS student_answers (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES quiz_submissions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  -- For multiple choice, this will be the index of the selected option
  selected_option_index INT,
  is_correct BOOLEAN NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_answers_submission_id ON student_answers(submission_id);
