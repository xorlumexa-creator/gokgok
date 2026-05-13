REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE ALL ON FUNCTION public.has_app_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_app_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_app_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_app_role(uuid, public.app_role) TO service_role;