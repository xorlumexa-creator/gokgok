
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
