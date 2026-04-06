
-- Add email column to otp_requests table
ALTER TABLE public.otp_requests ADD COLUMN IF NOT EXISTS email text;
CREATE INDEX IF NOT EXISTS idx_otp_requests_email ON public.otp_requests(email);

-- Add recovery tracking columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_recovery_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS recovery_month text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_fines integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fines_unpaid integer DEFAULT 0;
