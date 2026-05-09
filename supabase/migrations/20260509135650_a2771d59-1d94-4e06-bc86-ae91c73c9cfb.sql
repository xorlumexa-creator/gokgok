
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
