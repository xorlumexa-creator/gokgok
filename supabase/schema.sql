-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  shop_name TEXT,
  phone TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  trial_start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subscription_start_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
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

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS whatsapp_number text;

CREATE OR REPLACE FUNCTION public.find_email_for_recovery(lookup_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_email text;
BEGIN
  -- Check if input looks like email
  IF lookup_input ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    SELECT email INTO found_email FROM profiles WHERE email = lookup_input LIMIT 1;
  ELSE
    -- Treat as phone number
    SELECT email INTO found_email FROM profiles 
    WHERE phone ILIKE '%' || regexp_replace(lookup_input, '^0', '') || '%'
    LIMIT 1;
  END IF;
  
  RETURN found_email;
END;
$$;

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

-- Add email column to otp_requests table
ALTER TABLE public.otp_requests ADD COLUMN IF NOT EXISTS email text;
CREATE INDEX IF NOT EXISTS idx_otp_requests_email ON public.otp_requests(email);

-- Add recovery tracking columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_recovery_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS recovery_month text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_fines integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fines_unpaid integer DEFAULT 0;
DROP TABLE IF EXISTS public.otp_requests CASCADE;
DROP TABLE IF EXISTS public.recovery_tokens CASCADE;
DROP TABLE IF EXISTS public.password_recovery_logs CASCADE;
DROP TABLE IF EXISTS public.fines CASCADE;

DROP FUNCTION IF EXISTS public.find_user_for_recovery(text);
DROP FUNCTION IF EXISTS public.find_email_for_recovery(text);
DROP FUNCTION IF EXISTS public.get_monthly_recovery_count(text, text);

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS face_descriptor,
  DROP COLUMN IF EXISTS face_registered_at,
  DROP COLUMN IF EXISTS monthly_recovery_count,
  DROP COLUMN IF EXISTS recovery_month,
  DROP COLUMN IF EXISTS total_fines,
  DROP COLUMN IF EXISTS fines_unpaid;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, shop_name, phone, whatsapp_number)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'shop_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- 1. Profiles columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS plan text,
  ADD COLUMN IF NOT EXISTS plan_expiry timestamptz,
  ADD COLUMN IF NOT EXISTS temporary_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS temporary_expiry timestamptz,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique ON public.profiles(phone) WHERE phone IS NOT NULL;

-- 2. has_role function (avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Managers can view/update all profiles
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;
CREATE POLICY "Managers can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Managers can update all profiles" ON public.profiles;
CREATE POLICY "Managers can update all profiles" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'manager'));

-- 4. subscription_requests
CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_phone text NOT NULL,
  plan_type text NOT NULL,
  transaction_id text,
  screenshot_url text,
  payment_method text NOT NULL DEFAULT 'bkash',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own sub req" ON public.subscription_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own sub req" ON public.subscription_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Managers view all sub req" ON public.subscription_requests
  FOR SELECT USING (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers update sub req" ON public.subscription_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'manager'));

-- 5. password_reset_requests
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_phone text NOT NULL,
  temp_password text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert reset req" ON public.password_reset_requests
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Managers view reset req" ON public.password_reset_requests
  FOR SELECT USING (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "Managers update reset req" ON public.password_reset_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'manager'));

-- 6. daily_usage for credits
CREATE TABLE IF NOT EXISTS public.daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  count integer NOT NULL DEFAULT 0,
  UNIQUE(user_id, usage_date)
);
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own usage" ON public.daily_usage
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Managers view all usage" ON public.daily_usage
  FOR SELECT USING (public.has_role(auth.uid(), 'manager'));

-- 7. Update handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_role text := 'user';
BEGIN
  v_phone := NEW.raw_user_meta_data->>'phone';
  IF v_phone IN ('+8801920051662', '01920051662', '8801920051662') THEN
    v_role := 'manager';
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, shop_name, phone, whatsapp_number, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'shop_name',
    v_phone,
    v_phone,
    v_role
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read payment screenshots" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-screenshots');

CREATE POLICY "Authenticated upload payment screenshots" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'payment-screenshots' AND auth.role() = 'authenticated');

-- Allow managers to delete user profiles
CREATE POLICY "Managers can delete profiles"
ON public.profiles
FOR DELETE
USING (public.has_role(auth.uid(), 'manager'));

-- App settings (single-row config managed only by managers)
CREATE TABLE public.app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  cloud_cost_monthly NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BDT',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = 1)
);

INSERT INTO public.app_settings (id, cloud_cost_monthly) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view app settings"
ON public.app_settings FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only managers can update app settings"
ON public.app_settings FOR UPDATE
USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Only managers can insert app settings"
ON public.app_settings FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- Track monthly credit usage (resets each calendar month)
CREATE TABLE public.monthly_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  year_month TEXT NOT NULL, -- 'YYYY-MM'
  count INT NOT NULL DEFAULT 0,
  UNIQUE (user_id, year_month)
);

ALTER TABLE public.monthly_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own monthly usage"
ON public.monthly_usage FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers view all monthly usage"
ON public.monthly_usage FOR SELECT
USING (public.has_role(auth.uid(), 'manager'));

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_role text := 'user';
BEGIN
  v_phone := NEW.raw_user_meta_data->>'phone';
  IF v_phone IN ('+8801305969812', '01305969812', '8801305969812') THEN
    v_role := 'manager';
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, shop_name, phone, whatsapp_number, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'shop_name',
    v_phone,
    v_phone,
    v_role
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_role text := 'user';
BEGIN
  v_phone := NEW.raw_user_meta_data->>'phone';

  IF v_phone IN ('+8801305969812', '01305969812', '8801305969812') THEN
    v_role := 'manager';
  END IF;

  INSERT INTO public.profiles (user_id, full_name, shop_name, phone, whatsapp_number, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'shop_name',
    v_phone,
    v_phone,
    v_role
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    shop_name = COALESCE(EXCLUDED.shop_name, public.profiles.shop_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    whatsapp_number = COALESCE(EXCLUDED.whatsapp_number, public.profiles.whatsapp_number),
    role = EXCLUDED.role,
    email = NULL,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

UPDATE public.profiles SET email = NULL WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_user_id_role ON public.profiles(user_id, role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_subscription_requests_user_status ON public.subscription_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_monthly_usage_user_month ON public.monthly_usage(user_id, year_month);
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON public.daily_usage(user_id, usage_date);REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'manager');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_app_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text;
  v_role public.app_role := 'user';
BEGIN
  v_phone := NEW.raw_user_meta_data->>'phone';

  IF v_phone IN ('+8801305969812', '01305969812', '8801305969812') THEN
    v_role := 'manager';
  END IF;

  INSERT INTO public.profiles (user_id, full_name, shop_name, phone, whatsapp_number, role, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'shop_name',
    v_phone,
    v_phone,
    v_role::text,
    NULL
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    shop_name = COALESCE(EXCLUDED.shop_name, public.profiles.shop_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    whatsapp_number = COALESCE(EXCLUDED.whatsapp_number, public.profiles.whatsapp_number),
    role = EXCLUDED.role,
    email = NULL,
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.user_roles (user_id, role)
SELECT user_id, CASE WHEN role = 'manager' THEN 'manager'::public.app_role ELSE 'user'::public.app_role END
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Managers can view all roles" ON public.user_roles;
CREATE POLICY "Managers can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_app_role(auth.uid(), 'manager'));

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles(user_id, role);

GRANT EXECUTE ON FUNCTION public.has_app_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_app_role(uuid, public.app_role) TO service_role;REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE ALL ON FUNCTION public.has_app_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_app_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_app_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_app_role(uuid, public.app_role) TO service_role;CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = _role
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO service_role;CREATE TABLE IF NOT EXISTS public.user_backups (
  user_id UUID PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_backups TO authenticated;
GRANT ALL ON public.user_backups TO service_role;

ALTER TABLE public.user_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own backup"
ON public.user_backups
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers view all backups"
ON public.user_backups
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'manager'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan text,
  ADD COLUMN IF NOT EXISTS subscription_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS storage_level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sales_credit_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_credit_period text;
