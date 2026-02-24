-- ========================================================
-- GLOBAL SITE SETTINGS
-- ========================================================

BEGIN;

CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value_json JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default snow setting if not exists
-- We use a generic 'value_json' to store various settings in the future
INSERT INTO site_settings (key, value_json)
SELECT 'snow_enabled', 'true'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'snow_enabled');

-- Optional: Migrate existing setting from first teacher if applicable
DO $$
DECLARE
    existing_val BOOLEAN;
BEGIN
    SELECT snow_enabled INTO existing_val FROM users WHERE role = 'teacher' ORDER BY created_at ASC LIMIT 1;
    IF existing_val IS NOT NULL THEN
        UPDATE site_settings SET value_json = to_jsonb(existing_val) WHERE key = 'snow_enabled';
    END IF;
END $$;

COMMIT;

-- SUCCESS
DO $$
BEGIN
    RAISE NOTICE '✅ Global Snowfall setting initialized in site_settings table';
END $$;
