-- Ensure required columns exist for auth & theming (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_primary TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_secondary TEXT;

-- Helpful index for admin listing
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
