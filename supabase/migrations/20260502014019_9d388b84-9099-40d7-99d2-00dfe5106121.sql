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