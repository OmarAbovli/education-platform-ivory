DO $$
BEGIN
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='purchases' AND column_name='student_type') THEN
    ALTER TABLE purchases ADD COLUMN student_type TEXT DEFAULT 'center';
  END IF;
END
$$;