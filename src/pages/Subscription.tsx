import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Check, Crown, ShieldCheck, ArrowLeft, Clock, MessageCircle, Sparkles, TrendingUp, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import logoImg from '@/assets/logo.png';
import { useSubscription, toBn, PlanId, PLAN_BASE_PRICE, PLAN_LABEL, PLAN_ORDER, PRODUCT_UNIT, BAKI_UNIT, SALES_CREDIT_UNIT } from '@/context/SubscriptionContext';
import { UsageDashboard } from '@/components/subscription/UsageDashboard';
import { SubscriptionPaymentForm } from '@/components/SubscriptionPaymentForm';
import { useProfile } from '@/hooks/useProfile';
import { withTimeout } from '@/lib/asyncTimeout';
import { isOnline } from '@/lib/connectivity';

const PLAN_ICON: Record<PlanId, any> = { basic: ShieldCheck, standard: MessageCircle, premium: Crown };
const PLAN_TAGLINE: Record<PlanId, string> = {
  basic: 'সব মূল ফিচার',
  standard: 'সব + WhatsApp',
  premium: 'সব + WhatsApp + Invoice',
};

interface PendingRequest {
  id: string;
  plan_type: string;
  storage_level: number;
  request_type: string;
  amount_tk: number | null;
  created_at: string;
}

// A single selectable option in the plan/capacity picker. `kind` decides
// both the price math and the request_type sent to the server:
//  - 'new'    → full price, fresh 30-day cycle from approval time
//  - 'upgrade'→ price difference only, existing tenure fully preserved
type Selection = { plan: PlanId; level: number; kind: 'new' | 'upgrade' };

// Live countdown — pure client-side math off the cached expiry, so it
// keeps ticking correctly with no internet connection.
function useCountdown(expiresAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const diff = Math.max(0, new Date(expiresAt).getTime() - now);
  return {
    expired: diff <= 0,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
  };
}

function CountdownCard({ expiresAt, label }: { expiresAt: string; label: string }) {
  const cd = useCountdown(expiresAt);
  if (!cd) return null;
  return (
    <div className="card-elevated rounded-2xl p-5 mb-4 bg-card">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold text-foreground">{cd.expired ? 'মেয়াদ শেষ হয়ে গেছে' : 'বাকি সময়'}</p>
        </div>
      </div>
      {!cd.expired && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{toBn(cd.days)}</p>
            <p className="text-[11px] text-muted-foreground">দিন</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{toBn(cd.hours)}</p>
            <p className="text-[11px] text-muted-foreground">ঘণ্টা</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground tabular-nums">{toBn(cd.minutes)}</p>
            <p className="text-[11px] text-muted-foreground">মিনিট</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Subscription() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const focus = searchParams.get('focus'); // 'renew' | 'upgrade' | null — used for heading text only
  const { profile } = useProfile();
  const {
    plan, storageLevel, expiresAt, monthlyPrice,
    trialActive, trialDaysLeft, trialExpiresAt,
    hasActivePaidPlan, creditExhausted, isLocked,
    productLimitReached, bakiLimitReached,
    temporaryAccess, temporaryExpiry,
  } = useSubscription();

  const [checkingAuth, setCheckingAuth] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await withTimeout(supabase.auth.getSession(), 4000, 'subscription.getSession');
        if (!session && isOnline()) { navigate('/auth', { replace: true }); return; }
      } catch {} finally { setCheckingAuth(false); }
    })();
  }, [navigate]);

  // ── Mode derivation ──────────────────────────────────────────────────
  // noActivePlan  → trial / fully locked / waiting-for-approval bridge.
  //                 First-purchase experience: 3 base plans, level fixed
  //                 at 1×, full price, request_type='new'.
  // renewalMode   → an active plan exists but its sales+baki credit for
  //                 this cycle is exhausted. Full renewal allowed (any
  //                 tier, current capacity kept), fresh 30-day cycle,
  //                 request_type='new'.
  // upgradeOnly   → normal active plan, credit not exhausted. Can only
  //                 move to a STRICTLY more expensive tier (pay the
  //                 difference, tenure untouched), and can only see the
  //                 2×/3×/... capacity picker after actually hitting the
  //                 product/baki limit.
  const noActivePlan = !hasActivePaidPlan;
  const renewalMode = hasActivePaidPlan && creditExhausted;
  const upgradeOnlyMode = hasActivePaidPlan && !creditExhausted;
  const limitReached = productLimitReached || bakiLimitReached;

  const higherTiers = PLAN_ORDER.filter(p => PLAN_BASE_PRICE[p] > PLAN_BASE_PRICE[plan]);

  const [selection, setSelection] = useState<Selection | null>(null);
  const [showCapacityPicker, setShowCapacityPicker] = useState(false);

  // Re-derive the default selection whenever the underlying mode changes
  // (plan loaded from server, credit reset, limit newly hit, etc).
  useEffect(() => {
    const suggestedLevel = (location.state as { suggestedLevel?: number } | null)?.suggestedLevel;
    if (noActivePlan) {
      const defaultPlan = (PLAN_ORDER.includes(plan) ? plan : 'standard') as PlanId;
      setSelection({ plan: defaultPlan, level: 1, kind: 'new' });
      setShowCapacityPicker(false);
    } else if (renewalMode) {
      setSelection({ plan, level: storageLevel, kind: 'new' });
      setShowCapacityPicker(false);
    } else if (upgradeOnlyMode) {
      if (suggestedLevel && suggestedLevel > storageLevel) {
        setShowCapacityPicker(true);
        setSelection({ plan, level: Math.max(1, Math.min(10, suggestedLevel)), kind: 'upgrade' });
      } else if (higherTiers.length > 0) {
        setSelection({ plan: higherTiers[0], level: storageLevel, kind: 'upgrade' });
      } else {
        setSelection(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noActivePlan, renewalMode, upgradeOnlyMode, plan, storageLevel, location.state]);

  const pickTier = (p: PlanId) => {
    if (noActivePlan) setSelection({ plan: p, level: 1, kind: 'new' });
    else if (renewalMode) setSelection({ plan: p, level: storageLevel, kind: 'new' });
    else setSelection({ plan: p, level: storageLevel, kind: 'upgrade' });
    setShowCapacityPicker(false);
  };

  const pickCapacityLevel = (level: number) => {
    setSelection({ plan, level, kind: 'upgrade' });
  };

  // ── Pending request check ───────────────────────────────────────────
  // Prevents duplicate/confusing submissions while a manager is already
  // reviewing something for this user.
  const [pendingReq, setPendingReq] = useState<PendingRequest | null>(null);
  const [loadingPending, setLoadingPending] = useState(true);

  const loadPending = async () => {
    if (!profile) { setLoadingPending(false); return; }
    setLoadingPending(true);
    try {
      const { data } = await withTimeout(supabase
        .from('subscription_requests')
        .select('id, plan_type, storage_level, request_type, amount_tk, created_at')
        .eq('user_id', profile.user_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(), 5000, 'subscription.pendingCheck');
      setPendingReq((data as any) || null);
    } catch { /* non-fatal — just won't show the pending banner */ }
    finally { setLoadingPending(false); }
  };
  useEffect(() => { loadPending(); }, [profile?.user_id]);

  const [showPaymentFor, setShowPaymentFor] = useState<{ plan: PlanId; level: number; type: 'new' | 'upgrade'; amount: number } | null>(null);

  if (checkingAuth) return null;

  const targetPrice = selection ? PLAN_BASE_PRICE[selection.plan] * selection.level : 0;
  const isUpgrade = selection?.kind === 'upgrade';
  const amount = isUpgrade ? Math.max(0, targetPrice - monthlyPrice) : targetPrice;

  const openPayment = () => {
    if (!selection || pendingReq) return;
    setShowPaymentFor({ plan: selection.plan, level: selection.level, type: selection.kind, amount });
  };

  const heading = noActivePlan
    ? 'একটি প্ল্যান বেছে নিন'
    : renewalMode
    ? 'প্ল্যান নবায়ন করুন'
    : focus === 'upgrade' || showCapacityPicker
    ? 'ক্যাপাসিটি বাড়ান'
    : 'প্ল্যান আপগ্রেড করুন';

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted"><ArrowLeft className="w-5 h-5" /></button>
          <img src={logoImg} alt="Dukan 360" className="w-8 h-8 rounded-lg" />
          <h1 className="text-lg font-bold text-foreground">সাবস্ক্রিপশন</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* ── Status summary ─────────────────────────────────────────── */}
        {trialActive && (
          <div className="rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 p-4 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-primary" />
              <p className="font-bold text-foreground">আপনি ফ্রি ট্রায়ালে আছেন 🎉</p>
            </div>
            <p className="text-sm text-muted-foreground">৩ দিনের ট্রায়ালে সব ফিচার (WhatsApp + Invoice সহ) খোলা আছে — {toBn(PRODUCT_UNIT.toLocaleString())} পণ্য, {toBn(BAKI_UNIT.toLocaleString())} বাকি হিসাব, {toBn(SALES_CREDIT_UNIT.toLocaleString())} বিক্রি+বাকি-আপডেট।</p>
          </div>
        )}
        {trialActive && trialExpiresAt && <CountdownCard expiresAt={trialExpiresAt} label="ফ্রি ট্রায়াল শেষ হবে" />}

        {temporaryAccess && temporaryExpiry && !hasActivePaidPlan && (
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-900 p-4 mb-4">
            <p className="font-bold text-emerald-700 dark:text-emerald-300 mb-1">🎁 অস্থায়ী অ্যাক্সেস চালু আছে</p>
            <p className="text-sm text-emerald-700/90 dark:text-emerald-200 leading-relaxed">
              ম্যানেজার আপনার পেমেন্ট যাচাই করা পর্যন্ত অ্যাপ পুরোপুরি ব্যবহার করতে পারবেন। অনুমোদন হওয়ার মুহূর্ত থেকেই আপনার আসল ৩০ দিনের মেয়াদ শুরু হবে।
            </p>
          </div>
        )}
        {temporaryAccess && temporaryExpiry && !hasActivePaidPlan && (
          <CountdownCard expiresAt={temporaryExpiry} label="অস্থায়ী অ্যাক্সেসের মেয়াদ" />
        )}

        {isLocked && (
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-900 p-4 mb-4">
            <p className="font-bold text-rose-700 dark:text-rose-300 mb-1">🔒 ট্রায়াল শেষ হয়ে গেছে</p>
            <p className="text-sm text-rose-700/90 dark:text-rose-200 leading-relaxed">
              দোকান চালিয়ে যেতে নিচে থেকে একটা প্ল্যান বেছে নিন। আপনার সব তথ্য (পণ্য, বাকির হিসাব, বিক্রির ইতিহাস) সুরক্ষিত আছে — সাবস্ক্রাইব করলেই আবার সব খুলে যাবে।
            </p>
            <p className="text-xs text-rose-700/80 dark:text-rose-300 mt-2">এই মুহূর্তে বাকির খাতা শুধু দেখতে পারবেন (টাকার পরিমাণ), এডিট করতে সাবস্ক্রিপশন লাগবে।</p>
          </div>
        )}

        {creditExhausted && !isLocked && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-900 p-4 mb-4">
            <p className="font-bold text-amber-700 dark:text-amber-300 mb-1">⚠️ এই চক্রের বিক্রি+বাকি সীমা পূর্ণ</p>
            <p className="text-sm text-amber-700/90 dark:text-amber-200">নতুন বিক্রি বা বাকির আপডেট করতে প্ল্যান নবায়ন করুন। মেয়াদ শেষ হওয়ার আগেই এটা করা যায় — নবায়নে নতুন ৩০ দিনের মেয়াদ আজ থেকে শুরু হবে।</p>
          </div>
        )}

        {hasActivePaidPlan && expiresAt && !creditExhausted && (
          <CountdownCard expiresAt={expiresAt} label={`আপনার ${PLAN_LABEL[plan]} প্ল্যানের (${toBn(storageLevel)}×) মেয়াদ`} />
        )}

        {(hasActivePaidPlan || trialActive) && <div className="mb-4"><UsageDashboard /></div>}

        {/* ── Pending-request banner (blocks resubmission) ────────────── */}
        {!loadingPending && pendingReq && (
          <div className="rounded-2xl bg-primary/5 border-2 border-primary/20 p-4 mb-5">
            <p className="font-bold text-foreground mb-1">⏳ আপনার রিকোয়েস্ট পর্যালোচনাধীন</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {PLAN_LABEL[(pendingReq.plan_type as PlanId)] || pendingReq.plan_type} প্ল্যান
              {pendingReq.storage_level > 1 ? ` (${toBn(pendingReq.storage_level)}×)` : ''}
              {pendingReq.request_type === 'upgrade' ? ' আপগ্রেড' : ''} — ম্যানেজার অনুমোদন করলেই
              {pendingReq.request_type === 'upgrade' ? ' সাথে সাথে ফিচার চালু হবে।' : ' নতুন ৩০ দিনের মেয়াদ শুরু হবে।'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">{new Date(pendingReq.created_at).toLocaleString('bn-BD')}-এ জমা দেওয়া হয়েছে।</p>
          </div>
        )}

        {/* ── Plan picker ────────────────────────────────────────────── */}
        {!loadingPending && !pendingReq && (
          <>
            <h2 className="text-lg font-bold text-foreground mb-1">{heading}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {noActivePlan
                ? 'সহজ বাংলায়: যত বেশি ফিচার, দাম তত বেশি — কিন্তু পণ্য/বাকি/বিক্রির সীমা তিনটা প্ল্যানেই সমান। পরে দরকার হলে ক্যাপাসিটি (২×/৩×...) আলাদাভাবে বাড়ানো যাবে।'
                : renewalMode
                ? 'আপনার এই চক্রের ব্যবহারের সীমা শেষ — যেকোনো প্ল্যানে নবায়ন করুন, আপনার বর্তমান ক্যাপাসিটি (' + toBn(storageLevel) + '×) বজায় থাকবে।'
                : 'শুধু বেশি দামি প্ল্যানে আপগ্রেড করা যাবে — শুধু পার্থক্যটুকু দিতে হবে, বর্তমান মেয়াদ অপরিবর্তিত থাকবে।'}
            </p>

            {(noActivePlan || renewalMode) && (
              <div className="space-y-3 mb-5">
                {PLAN_ORDER.map((p) => {
                  const Icon = PLAN_ICON[p];
                  const level = noActivePlan ? 1 : storageLevel;
                  const price = PLAN_BASE_PRICE[p] * level;
                  const selected = selection?.plan === p;
                  const isCurrent = hasActivePaidPlan && plan === p;
                  return (
                    <button
                      key={p}
                      onClick={() => pickTier(p)}
                      className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${selected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{PLAN_LABEL[p]}</p>
                            <p className="text-xs text-muted-foreground">{PLAN_TAGLINE[p]}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-foreground">৳{toBn(price)}</p>
                          <p className="text-[11px] text-muted-foreground">/মাস</p>
                        </div>
                      </div>
                      {isCurrent && <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">আগের প্ল্যান</span>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                        <Feature ok label={`${toBn((PRODUCT_UNIT * level).toLocaleString())} পণ্য`} />
                        <Feature ok label={`${toBn((BAKI_UNIT * level).toLocaleString())} বাকি হিসাব`} />
                        <Feature ok label="১০,০০০ বিক্রি+বাকি (স্থির)" />
                        <Feature ok={p !== 'basic'} label="WhatsApp রিমাইন্ডার" />
                        <Feature ok={p === 'premium'} label="Invoice / PDF" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Tier upgrade cards (active plan, credit not exhausted) ── */}
            {upgradeOnlyMode && (
              higherTiers.length === 0 ? (
                <div className="rounded-2xl border border-border p-5 mb-5 text-center">
                  <Crown className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="font-semibold text-foreground">আপনি সর্বোচ্চ প্ল্যানে আছেন 🎉</p>
                  <p className="text-xs text-muted-foreground mt-1">Premium প্ল্যানের সব ফিচার ইতিমধ্যে আপনার কাছে আছে।</p>
                </div>
              ) : (
                <div className="space-y-3 mb-5">
                  {higherTiers.map((p) => {
                    const Icon = PLAN_ICON[p];
                    const price = PLAN_BASE_PRICE[p] * storageLevel;
                    const diff = Math.max(0, price - monthlyPrice);
                    const selected = selection?.kind === 'upgrade' && selection.plan === p && !showCapacityPicker;
                    return (
                      <button
                        key={p}
                        onClick={() => pickTier(p)}
                        className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${selected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{PLAN_LABEL[p]}</p>
                              <p className="text-xs text-muted-foreground">{PLAN_TAGLINE[p]}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-primary">+৳{toBn(diff)}</p>
                            <p className="text-[11px] text-muted-foreground">/মাস, একবার</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                          <Feature ok={p !== 'basic'} label="WhatsApp রিমাইন্ডার" />
                          <Feature ok={p === 'premium'} label="Invoice / PDF" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            )}

            {/* ── Capacity upgrade — hidden until the user actually hits a limit ── */}
            {upgradeOnlyMode && limitReached && !showCapacityPicker && (
              <button
                onClick={() => { setShowCapacityPicker(true); pickCapacityLevel(Math.min(10, storageLevel + 1)); }}
                className="w-full rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4 mb-5 text-left flex items-center gap-3"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">🔥 পণ্য/বাকির সীমা শেষ — ক্যাপাসিটি বাড়ান</p>
                  <p className="text-xs text-muted-foreground">শুধু পার্থক্যটুকু দিন, মেয়াদ অপরিবর্তিত থাকবে</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            )}

            {upgradeOnlyMode && showCapacityPicker && (
              <div className="rounded-2xl border border-border p-4 mb-5">
                <p className="font-semibold text-foreground mb-1">ক্যাপাসিটি বাড়ান ({PLAN_LABEL[plan]} প্ল্যান)</p>
                <p className="text-xs text-muted-foreground mb-3">বর্তমান: {toBn(storageLevel)}× — বেশি পণ্য/বাকি হিসাব দরকার হলে লেভেল বাড়ান। মেয়াদ একই থাকবে, শুধু পার্থক্যটুকু দিতে হবে।</p>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 10 }, (_, i) => i + 1).filter(lvl => lvl > storageLevel).map(lvl => {
                    const diff = PLAN_BASE_PRICE[plan] * lvl - monthlyPrice;
                    const selectedLvl = selection?.kind === 'upgrade' && selection.level === lvl && selection.plan === plan;
                    return (
                      <button
                        key={lvl}
                        onClick={() => pickCapacityLevel(lvl)}
                        className={`rounded-xl border-2 py-2.5 px-1 text-center transition-all ${selectedLvl ? 'border-primary bg-primary/5' : 'border-border'}`}
                      >
                        <p className="font-bold text-foreground text-sm">{toBn(lvl)}×</p>
                        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{toBn((PRODUCT_UNIT * lvl).toLocaleString())} পণ্য</p>
                        <p className="text-[10px] text-primary font-semibold leading-tight">+৳{toBn(diff)}</p>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => { setShowCapacityPicker(false); if (higherTiers.length) pickTier(higherTiers[0]); }} className="text-xs text-muted-foreground mt-3 underline">
                  বাতিল করে প্ল্যান আপগ্রেডে ফিরে যান
                </button>
              </div>
            )}

            {/* ── CTA ─────────────────────────────────────────────────── */}
            {selection && (
              <div className="rounded-2xl bg-muted/50 p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{isUpgrade ? 'অতিরিক্ত দিতে হবে' : 'মোট দাম'}</span>
                  <span className="text-2xl font-bold text-foreground">৳{toBn(amount)}<span className="text-sm font-normal text-muted-foreground">{isUpgrade ? '' : '/মাস'}</span></span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {isUpgrade
                    ? 'শুধু পার্থক্যটুকু দিতে হচ্ছে — আপনার বর্তমান মেয়াদ (কতদিন বাকি আছে) অপরিবর্তিত থাকবে।'
                    : 'নতুন ৩০ দিনের মেয়াদ ম্যানেজার অনুমোদন করার মুহূর্ত থেকে শুরু হবে এবং বিক্রি+বাকি-আপডেটের সীমাও রিসেট হবে।'}
                </p>
                <Button onClick={openPayment} className="w-full btn-primary py-6 rounded-xl text-base" disabled={isUpgrade && amount <= 0}>
                  {isUpgrade ? 'আপগ্রেড করুন' : renewalMode ? 'নবায়ন করুন' : 'এই প্ল্যান নিন'}
                </Button>
              </div>
            )}

            <div className="flex items-start gap-2 text-xs text-muted-foreground mb-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <p>সাবস্ক্রিপশন অনুমোদনের মুহূর্ত থেকে ৩০ দিনের জন্য বৈধ থাকে। আপগ্রেড করলে বর্তমান মেয়াদই বজায় থাকে — শুধু নতুন প্ল্যান/ক্যাপাসিটি নিতে হলে বা সীমা শেষ হলে নতুন করে মেয়াদ শুরু হয়।</p>
            </div>
          </>
        )}

        {loadingPending && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> লোড হচ্ছে...
          </div>
        )}
      </div>

      {showPaymentFor && profile && (
        <div className="fixed inset-0 z-[150] bg-black/50 flex items-end sm:items-center justify-center p-3">
          <div className="w-full max-w-md bg-card rounded-3xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground">পেমেন্ট সম্পন্ন করুন</h3>
              <button onClick={() => setShowPaymentFor(null)} className="text-muted-foreground">✕</button>
            </div>
            <SubscriptionPaymentForm
              userId={profile.user_id}
              userPhone={profile.phone || ''}
              plan={showPaymentFor.plan}
              storageLevel={showPaymentFor.level}
              amount={String(showPaymentFor.amount)}
              requestType={showPaymentFor.type}
              amountTk={showPaymentFor.amount}
              onDone={() => { setShowPaymentFor(null); loadPending(); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Feature({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${ok ? 'text-foreground' : 'text-muted-foreground line-through opacity-60'}`}>
      <Check className={`w-3.5 h-3.5 ${ok ? 'text-emerald-600' : 'text-muted-foreground'}`} /> {label}
    </span>
  );
}
