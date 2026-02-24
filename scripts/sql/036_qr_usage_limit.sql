-- Add usage_count and max_uses to qr_tokens to limit scans
ALTER TABLE qr_tokens ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE qr_tokens ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT 1;

-- If is_permanent is TRUE (from previous migration), allowing infinite scans is tricky with max_uses.
-- We can say: max_uses = -1 means infinite, OR we update old "permanent" tokens to have a high max_uses or handle them specially.
-- User requested "3 scans" now.

-- Update existing "permanent" tokens to have max_uses = 3 (as requested, these were likely printed recently)
UPDATE qr_tokens 
SET max_uses = 3 
WHERE is_permanent = TRUE AND usage_count = 0;

-- Update existing "permanent" tokens that are already used? They shouldn't be used if they were permanent.
-- Permanent tokens didn't track usage count before (they bypassed 'used' check).
-- So existing permanent tokens have usage_count = 0.
