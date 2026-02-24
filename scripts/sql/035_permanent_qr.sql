-- Add is_permanent column to qr_tokens to allow reusable tokens
ALTER TABLE qr_tokens ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN DEFAULT FALSE;
