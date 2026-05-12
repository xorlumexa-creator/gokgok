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
$$;