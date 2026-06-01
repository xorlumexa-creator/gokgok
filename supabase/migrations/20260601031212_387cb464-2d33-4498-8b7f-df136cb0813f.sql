CREATE TABLE IF NOT EXISTS public.user_backups (
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
