CREATE OR REPLACE FUNCTION public.handle_new_user()
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
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON public.daily_usage(user_id, usage_date);