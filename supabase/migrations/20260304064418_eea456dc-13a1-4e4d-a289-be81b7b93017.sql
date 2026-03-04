
-- OTP requests table
CREATE TABLE public.otp_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  otp_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_requests ENABLE ROW LEVEL SECURITY;

-- Allow service role only (edge functions use service role)
CREATE POLICY "Service role can manage OTP requests"
ON public.otp_requests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fines table
CREATE TABLE public.fines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL DEFAULT 10,
  reason text NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fines"
ON public.fines
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage fines"
ON public.fines
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
