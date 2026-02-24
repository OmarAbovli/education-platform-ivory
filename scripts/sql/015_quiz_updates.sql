-- More quiz system improvements for editing and attempt management

-- Add max_attempts to quizzes table and remove the old boolean column
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS max_attempts INT DEFAULT 1 NOT NULL,
DROP COLUMN IF EXISTS allow_multiple_attempts;

-- Add a cascading delete trigger to questions when a quiz is deleted.
-- This is handled by the application logic for now, but a foreign key with CASCADE DELETE is a good practice.
-- For example:
-- ALTER TABLE questions
-- DROP CONSTRAINT IF EXISTS questions_quiz_id_fkey,
-- ADD CONSTRAINT questions_quiz_id_fkey
--   FOREIGN KEY (quiz_id)
--   REFERENCES quizzes(id)
--   ON DELETE CASCADE;
-- (Will implement this in the server action for now to ensure all related data is cleaned up)
