-- Add CDN hostname field for Bunny.net per teacher
-- This lets each teacher configure their exact Pull Zone hostname
-- e.g. vz-c5b33ef7-9f5.b-cdn.net
ALTER TABLE users ADD COLUMN IF NOT EXISTS bunny_cdn_hostname TEXT;
