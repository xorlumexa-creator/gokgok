# Dukan 360° — Manager Panel & Phone Auth Overhaul

A large, multi-system change. Below is the full plan. After your approval I will execute everything in one pass.

---

## 1. Authentication — Phone + Password only

Supabase Auth requires an identifier. Since we are removing email entirely, every user will sign in with **phone number + password**. We will use a synthetic email under the hood (`<digits>@dukan360.local`) so Supabase Auth keeps working, but the UI only shows phone.

**Signup fields**: Full Name, Shop Name, Phone (+880 default, unique), Password, Confirm Password.

**Login fields**: Phone, Password.

Phone uniqueness enforced via a UNIQUE index on `profiles.phone`.

Removed completely:
- Email field, email auth, password reset emails
- Resend, OTP edge functions, RecoveryFlow email screen
- Any face/SMS/OTP code remnants

---

## 2. Manager Account

- Manager phone: **01920051662** (normalized to `+8801920051662`)
- On signup or first login with this phone → role auto-set to `manager` and routed to `/manager`
- All other users → role `user` → normal `/dashboard`

---

## 3. Database Changes (single migration)

**`profiles`** — add columns:
- `role` text default `'user'` (`'user'` | `'manager'`)
- `plan` text default `null` (`'basic'` | `'standard'` | `'pro'`)
- `plan_expiry` timestamptz
- `temporary_access` boolean default false
- `temporary_expiry` timestamptz
- `must_change_password` boolean default false
- UNIQUE index on `phone`

**`subscription_requests`** — id, user_id, user_phone, plan_type, transaction_id, screenshot_url, payment_method, status (`pending|approved|rejected`), created_at, resolved_at.

**`password_reset_requests`** — id, user_id, user_phone, temp_password (hashed reference only — actual temp password held in `pending_temp` short-lived field returned to manager once), status, created_at, resolved_at.

**Storage bucket**: `payment-screenshots` (public read, authenticated write to own folder).

**`has_role(uid, role)`** SECURITY DEFINER function for RLS.

**RLS**:
- profiles: user reads/updates own; manager reads/updates all
- subscription_requests: user inserts/reads own; manager reads/updates all
- password_reset_requests: insert allowed by anyone with valid phone match; manager reads/updates all; user reads own

**Trigger** `handle_new_user` updated to:
- Insert profile with phone + names from metadata
- Auto-assign `role='manager'` if phone = `+8801920051662`

---

## 4. Subscription Plans (final pricing)

| Plan | Price | Features |
|---|---|---|
| Basic | ৳80/mo | Core only, no WhatsApp, no invoice |
| Standard | ৳140/mo | + WhatsApp deep links, supplier alerts, templates |
| Pro | ৳200/mo | + Invoice print, PDF, WhatsApp receipts, all unlocked |

All plans share limits: 1000 products, 1000 baki holders, 600 daily credit actions.

`Subscription.tsx` and `Landing.tsx` updated to these prices.

---

## 5. Daily Credit System

- 600 actions/day (sale, product edit, baki entry, personal hishab entry)
- Tracked in `daily_usage` table: `(user_id, date, count)`
- `useCredit()` hook checks/increments; resets automatically (per-day row)
- UI shows remaining credits in header

---

## 6. Manual Subscription Flow

User taps Subscribe → form:
- Select plan
- Show bKash/Nagad number **01920051662**
- Upload screenshot (to `payment-screenshots`) OR enter Transaction ID
- Submit → row in `subscription_requests` (status `pending`)
- Profile gets `temporary_access=true`, `temporary_expiry=now()+1 day`
- Toast: "১ দিনের ফ্রি অ্যাক্সেস চালু হয়েছে"

After expiry without approval → `SubscriptionLock` screen "অপেক্ষমাণ / প্রত্যাখ্যাত"

---

## 7. Manager Panel (`/manager`)

Sidebar sections:
1. **Dashboard** — counts (pending requests, users, active subs, revenue est.)
2. **Subscription Requests** — list pending → cards with phone, shop, plan, screenshot preview, txn id, time → ✅ Approve / ❌ Reject
3. **Password Reset Requests** — list pending → ✅ Send via WhatsApp / ❌ Reject
4. **Users List** — searchable table (phone, shop, plan, status)
5. **Statistics** — basic charts (signups/day, plan distribution)

Approve action → updates user `subscription_status='active'`, `plan`, `plan_expiry=+30d`, request `status='approved'`.

Reject → request `status='rejected'`, user sees rejection screen on next load.

---

## 8. Forgot Password (Phone + WhatsApp)

User flow:
1. Tap "পাসওয়ার্ড ভুলে গেছেন?"
2. Enter phone → check exists
3. If not found → "এই ফোন নম্বরে কোনো একাউন্ট পাওয়া যায়নি।"
4. If found → create `password_reset_requests` row with auto-generated temp password (e.g. `DK4832X9`); call edge function `reset-password-temp` (service-role) to update auth password + set `must_change_password=true`
5. Show waiting screen with the security message

Manager flow:
1. Open request → see phone, shop, time, the temp password
2. Tap "Send via WhatsApp" → `window.open('https://wa.me/<phone>?text=<encoded message>')`
3. Mark resolved

After user logs in with temp password → forced to `/profile/change-password` until updated → `must_change_password=false`.

---

## 9. Offline-First Sync

Existing `syncEngine.ts` already does 5-min cycles and IndexedDB queue. Updates:
- Change cycle to **25 minutes**
- Sync immediately on app open (already done)
- UI states in `SyncIndicator`:
  - 🟢 সব ডাটা সেভ হয়েছে
  - 🟡 X টি ডাটা সেভ হয়নি
  - 🔄 সিঙ্ক হচ্ছে...
  - শেষ সিঙ্ক: X মিনিট আগে
- Never delete unsynced records; dedupe via record `id` (already keyPath)

---

## 10. Routing & Guards

`App.tsx`:
- `/` → Landing (public)
- `/auth` → phone+password screens
- `/forgot-password` → phone reset flow (waiting screen)
- `/manager/*` → ManagerRoute (requires role=manager)
- `/dashboard/*` → ProtectedRoute (user, must not need password change, must have access)

New `RoleRoute` redirects manager to `/manager` if they hit user routes.

---

## 11. Files to create

- `src/pages/ForgotPassword.tsx`
- `src/pages/ChangePassword.tsx`
- `src/pages/manager/ManagerLayout.tsx`
- `src/pages/manager/ManagerDashboard.tsx`
- `src/pages/manager/SubscriptionRequests.tsx`
- `src/pages/manager/PasswordResetRequests.tsx`
- `src/pages/manager/UsersList.tsx`
- `src/pages/manager/Statistics.tsx`
- `src/components/SubscriptionPaymentForm.tsx`
- `src/hooks/useCredits.ts`
- `src/hooks/useRole.ts`
- `supabase/functions/reset-password-temp/index.ts` (service-role updates auth password)
- `supabase/functions/create-user/index.ts` (signup wrapper that creates phone-mapped auth user; alternative: client uses synthetic email directly)

## 12. Files to modify

- `src/pages/Auth.tsx` — phone-only signup/login
- `src/pages/Landing.tsx` — pricing 80/140/200
- `src/pages/Subscription.tsx` — payment form
- `src/components/auth/RecoveryFlow.tsx` — phone reset
- `src/App.tsx` — routes + guards
- `src/lib/syncEngine.ts` — 25-min interval
- `src/components/dashboard/SyncIndicator.tsx` — full status
- Remove: `src/pages/ResetPassword.tsx` (email link reset no longer used)

---

## 13. Order of execution

1. Migration (schema + RLS + trigger + bucket)
2. Edge function `reset-password-temp`
3. Auth pages rewrite (phone-only)
4. Subscription payment form + Landing pricing
5. Manager Panel pages + routing guards
6. Forgot/Change password pages
7. Credits hook + integration in Sell/Products/Baki/PersonalAccounts
8. Sync engine + indicator updates
9. Remove obsolete email-recovery files

Approve and I will execute the full migration first, then all code in one pass.
