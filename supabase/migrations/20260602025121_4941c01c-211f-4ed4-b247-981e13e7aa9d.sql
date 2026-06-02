
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan text,
  ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS storage_level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sales_credit_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_credit_period text;
