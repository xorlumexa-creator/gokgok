# Connecting Dukan 360° to an External Supabase Project

If you've forked this repo and connected your **own** Supabase project (instead of Lovable Cloud), follow these steps to make the database, auth, and storage work correctly.

## 1. Apply the database schema

Open your Supabase dashboard → **SQL Editor** → New query, then run each file from `supabase/migrations/` **in chronological order** (filenames are timestamped).

Or run the consolidated file in one shot:

```
supabase/schema.sql
```

This creates:
- `profiles`, `user_roles`, `app_settings`
- `daily_usage`, `monthly_usage`
- `password_reset_requests`, `subscription_requests`, `user_backups`
- The `app_role` enum (`user`, `manager`)
- Security-definer functions: `has_role`, `has_app_role`, `handle_new_user`, `update_updated_at_column`
- RLS policies and required GRANTs

## 2. Create the auth trigger

The `handle_new_user()` function exists, but Supabase requires you to attach it to `auth.users` manually:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 3. Create the storage bucket

Dashboard → **Storage** → New bucket:
- Name: `payment-screenshots`
- Public: **Yes**

## 4. Set environment variables

In your hosting platform (Netlify, Vercel, etc.) and locally in `.env`:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
VITE_SUPABASE_PROJECT_ID=<your-project-ref>
```

## 5. Deploy edge functions

```
supabase link --project-ref <your-project-ref>
supabase functions deploy manager-admin
supabase functions deploy reset-password-temp
```

Add the required secret in Supabase → **Edge Functions** → Secrets:
- `RESEND_API_KEY` (for password reset emails — get one from resend.com)

## 6. Configure auth

Dashboard → **Authentication** → Providers:
- Enable Email/Password
- Disable "Confirm email" if you want instant signup

Dashboard → **Authentication** → URL Configuration:
- Site URL: your production URL
- Redirect URLs: include both production and `http://localhost:5173`

## 7. Make yourself a manager

After your first signup, run in SQL Editor:

```sql
UPDATE public.profiles SET role = 'manager' WHERE phone = '<your-phone>';
INSERT INTO public.user_roles (user_id, role)
  SELECT user_id, 'manager'::app_role FROM public.profiles WHERE phone = '<your-phone>'
  ON CONFLICT DO NOTHING;
```

Done — the app should now run end-to-end against your external Supabase.
