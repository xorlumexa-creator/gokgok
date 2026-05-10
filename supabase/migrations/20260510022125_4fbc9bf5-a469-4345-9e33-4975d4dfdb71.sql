
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
