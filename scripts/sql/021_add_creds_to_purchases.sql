DO $$
BEGIN
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='purchases' AND column_name='username') THEN
    ALTER TABLE purchases ADD COLUMN username TEXT;
  END IF;
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='purchases' AND column_name='password_hash') THEN
    ALTER TABLE purchases ADD COLUMN password_hash TEXT;
  END IF;
END
$$;