-- Improvements for the quiz system

-- Add new columns to the quizzes table
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS time_limit_minutes INT,
ADD COLUMN IF NOT EXISTS passing_score INT CHECK (passing_score BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS allow_multiple_attempts BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN DEFAULT FALSE;

-- Add feedback column to the questions table
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS feedback TEXT;

-- Remove the unique constraint on quiz_submissions to allow multiple attempts
ALTER TABLE quiz_submissions DROP CONSTRAINT IF EXISTS quiz_submissions_quiz_id_student_id_key;
