
-- Add face_descriptor to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS face_descriptor jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS face_registered_at timestamptz;

-- Update fines default amount to 20
ALTER TABLE fines ALTER COLUMN amount SET DEFAULT 20;

-- Create password_recovery_logs table
CREATE TABLE IF NOT EXISTS password_recovery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  method text NOT NULL DEFAULT 'face',
  month text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

ALTER TABLE password_recovery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recovery logs"
  ON password_recovery_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages recovery logs"
  ON password_recovery_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Create recovery_tokens table for secure password reset
CREATE TABLE IF NOT EXISTS recovery_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE recovery_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages tokens"
  ON recovery_tokens FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Function to find user by phone for recovery (no auth needed)
CREATE OR REPLACE FUNCTION find_user_for_recovery(p_phone text)
RETURNS TABLE(p_user_id uuid, p_face_descriptor jsonb, p_full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT pr.user_id, pr.face_descriptor, pr.full_name
  FROM profiles pr
  WHERE pr.phone ILIKE '%' || regexp_replace(p_phone, '^0', '') || '%'
  LIMIT 1;
END;
$$;

-- Function to count monthly recoveries
CREATE OR REPLACE FUNCTION get_monthly_recovery_count(p_phone text, p_month text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_count integer;
BEGIN
  SELECT pr.user_id INTO v_user_id FROM profiles pr
  WHERE pr.phone ILIKE '%' || regexp_replace(p_phone, '^0', '') || '%'
  LIMIT 1;
  
  IF v_user_id IS NULL THEN RETURN 0; END IF;
  
  SELECT COUNT(*)::integer INTO v_count
  FROM password_recovery_logs
  WHERE user_id = v_user_id AND month = p_month AND success = true;
  
  RETURN v_count;
END;
$$;
