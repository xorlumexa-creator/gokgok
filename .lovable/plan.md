## Goal

Rebuild the auth experience to be fast and simple (email + password, no OTP, no verification), add a polished Bangla landing page, replace the logo everywhere with the uploaded Dukan 360° mark, and remove the product category section from the Add Product page.

PWA / performance items from the brief (lazy loading, IndexedDB-first, service worker, 20-min background sync, skeleton loading) are already implemented in earlier passes — I will only verify and tune, not rebuild.

---

## 1. New logo

- Replace `src/assets/logo.png` with the uploaded `Dukan 360°` image.
- Replace `public/icons/icon-192.png`, `public/icons/icon-512.png`, and `public/apple-touch-icon.png` with resized versions of the same image so the PWA install icon and home-screen icon update.
- The logo is already imported via `@/assets/logo.png` on Auth, Index/StoreSetup, Header, etc., so swapping the file updates the app everywhere automatically. I'll spot-check Header, OnboardingModal, and Subscription to confirm.

## 2. Auth overhaul (email + password, no OTP)

Remove the OTP / fine recovery system and replace with Supabase's built-in password reset link.

**Database migration**
- Drop `otp_requests`, `recovery_tokens`, `password_recovery_logs`, `fines` tables.
- Drop columns from `profiles`: `face_descriptor`, `face_registered_at`, `monthly_recovery_count`, `recovery_month`, `total_fines`, `fines_unpaid`.
- Drop functions: `find_user_for_recovery`, `find_email_for_recovery`, `get_monthly_recovery_count`.
- Update `handle_new_user` trigger to also write `full_name`, `shop_name`, `phone`, `whatsapp_number` from `raw_user_meta_data` so signup is one round-trip.
- Add the trigger on `auth.users` (currently missing — that's why profile inserts happen client-side today).

**Edge functions**
- Delete `supabase/functions/send-otp-email` and `supabase/functions/verify-otp`.

**Auth settings**
- Disable email confirmation via `configure_auth` (`mailer_autoconfirm: true`) so users land logged in immediately after signup.
- Keep leaked-password (HIBP) check on.

**Signup page (`src/pages/Auth.tsx` rewrite)**
Real email signup (not the synthetic `phone@dokan360.app` trick currently in use). Fields:
- নাম (full_name)
- দোকানের নাম (shop_name) — collected here now, skips the old StoreSetup step
- মোবাইল নাম্বার (phone with country picker, kept)
- ইমেইল ঠিকানা (email) + warning notice "এই ইমেইলে পাসওয়ার্ড রিসেট লিংক যাবে"
- পাসওয়ার্ড (≥6 chars, show/hide toggle)
- পাসওয়ার্ড নিশ্চিত করুন

Calls `supabase.auth.signUp({ email, password, options: { data: { full_name, shop_name, phone, country } } })`. Auto-redirect to `/dashboard` (or onboarding if shop_name still missing for legacy users).

Validation messages in Bangla as specified ("সঠিক ইমেইল দিন", "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে", "পাসওয়ার্ড মিলছে না", "এই ইমেইল দিয়ে আগেই একাউন্ট আছে").

**Login page**
- Email + password (replaces phone-based synthetic email login).
- "পাসওয়ার্ড ভুলে গেছেন?" link → forgot-password screen.
- Error: "ইমেইল বা পাসওয়ার্ড ভুল".

**Forgot password**
- Single screen: enter email → `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`.
- Toast: "রিসেট লিংক ইমেইলে পাঠানো হয়েছে".
- Rewrite `src/components/auth/RecoveryFlow.tsx` to this simple form (or replace with inline state in Auth.tsx).

**Reset password page**
- `src/pages/ResetPassword.tsx` already exists — verify it handles `type=recovery` hash, calls `supabase.auth.updateUser({ password })`, shows success message "পাসওয়ার্ড পরিবর্তন হয়েছে!", and redirects to `/dashboard`.

## 3. Landing page

- New file `src/pages/Landing.tsx` with the sections from the brief: hero (logo + "আপনার দোকানের সম্পূর্ণ ডিজিটাল সমাধান" + ফ্রি ট্রায়াল CTA), 4 feature cards (বিক্রি / বাকি / WhatsApp / রিপোর্ট), why-choose-us bullets, 3 pricing cards (Basic ৳80, Standard ৳140 highlighted, Pro ৳200 — matching current `src/data/countries.ts` so we don't contradict the subscription page), trust line, final CTA.
- Mobile-first, teal primary, rounded-2xl cards, soft shadows, skeleton-free static content for instant paint.
- Route change in `src/App.tsx`: `/` shows Landing for unauthenticated visitors; `Index.tsx` flow (auth check + onboarding redirect) moves to a small wrapper or runs only when a session exists. Landing CTAs route to `/auth`.

## 4. Remove product categories

- In `src/pages/Products.tsx` delete the category chips block (around lines 430-470), the `category` field from `formData`, the `category` value passed into `addProduct` / `updateProduct`, and the reset.
- Leave the `category` column in IndexedDB / Supabase as-is (no migration needed) — just stop writing/reading it from the form.

## 5. PWA / performance verification

Already in place from prior work:
- `vite-plugin-pwa` with iframe guard, NetworkFirst HTML, lazy-loaded routes via `React.lazy`.
- `src/lib/syncEngine.ts` with 20-min background sync.
- IndexedDB-first reads via `StoreContext`.

I will only:
- Confirm the Landing route is excluded from auth-required wrappers.
- Confirm new logo files are picked up by the PWA manifest cache (`globPatterns` already covers `**/*.{js,css,html,png,svg,...}`).
- No new heavy dependencies.

---

## Technical details (for engineers)

**Files created**
- `src/pages/Landing.tsx`

**Files edited**
- `src/assets/logo.png` (replaced)
- `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/apple-touch-icon.png` (replaced)
- `src/pages/Auth.tsx` (rewrite to email-based, add shop_name)
- `src/components/auth/RecoveryFlow.tsx` (simplify to email-link reset)
- `src/pages/ResetPassword.tsx` (verify/clean)
- `src/pages/Products.tsx` (remove category UI + state)
- `src/App.tsx` (add `/` Landing route, move auth gate)
- `src/pages/Index.tsx` (becomes auth-redirect helper or removed)
- `src/pages/Profile.tsx` (remove fines / recovery-count UI)

**Files deleted**
- `supabase/functions/send-otp-email/index.ts`
- `supabase/functions/verify-otp/index.ts`

**Migration SQL (high level)**
```sql
DROP TABLE IF EXISTS otp_requests, recovery_tokens, password_recovery_logs, fines CASCADE;
ALTER TABLE profiles
  DROP COLUMN IF EXISTS face_descriptor,
  DROP COLUMN IF EXISTS face_registered_at,
  DROP COLUMN IF EXISTS monthly_recovery_count,
  DROP COLUMN IF EXISTS recovery_month,
  DROP COLUMN IF EXISTS total_fines,
  DROP COLUMN IF EXISTS fines_unpaid,
  ADD COLUMN IF NOT EXISTS shop_name text;
DROP FUNCTION IF EXISTS find_user_for_recovery, find_email_for_recovery, get_monthly_recovery_count;
-- Updated handle_new_user inserts full_name/shop_name/phone from raw_user_meta_data
-- Trigger on auth.users AFTER INSERT
```

**Auth settings**
- `mailer_autoconfirm: true` (no email verification)
- `password_min_length: 6`
- `password_hibp_enabled: true`

---

## Out of scope (not changing now)

- Subscription tier prices, WhatsApp/invoice locks, thermal printer layout — already implemented.
- Translating the entire dashboard.
- Adding Google sign-in (can be added later if you want).

Approve and I'll implement everything in one pass.