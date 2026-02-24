-- Migration: create purchases table to store purchase orders created via Paymob
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_token TEXT UNIQUE,
  user_id TEXT,
  paymob_order_id TEXT,
  payment_token TEXT,
  amount_cents INTEGER,
  currency TEXT,
  months_count INTEGER,
  months_list TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  parent_phone TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS purchases_paymob_order_id_idx ON purchases (paymob_order_id);
CREATE INDEX IF NOT EXISTS purchases_status_idx ON purchases (status);
