import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Check, Crown, ShieldCheck, ArrowLeft, Clock, MessageCircle, Sparkles } from 'lucide-react';
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
  const focus = searchParams.get('focus'); // 'renew' | 'upgrade' | null
  const { profile } = useProfile();
  const {
    plan, storageLevel, expiresAt, monthlyPrice,
    trialActive, trialDaysLeft, trialExpiresAt,
    hasActivePaidPlan, creditExhausted, isLocked,
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

  // Plan picker selection — defaults to the user's current tier, or a
  // sensible starting point (Standard) for a first-time subscriber.
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(hasActivePaidPlan ? plan : 'standard');
  const [desiredLevel, setDesiredLevel] = useState<number>(storageLevel || 1);
  const [showPaymentFor, setShowPaymentFor] = useState<{ plan: PlanId; level: number; type: 'new' | 'upgrade'; amount: number } | null>(null);

  useEffect(() => {
    if (hasActivePaidPlan) { setSelectedPlan(plan); setDesiredLevel(storageLevel); }
    const suggested = (location.state as { suggestedLevel?: number } | null)?.suggestedLevel;
    if (suggested) setDesiredLevel(Math.max(1, Math.min(10, suggested)));
  }, [hasActivePaidPlan, plan, storageLevel, location.state]);

  if (checkingAuth) return null;

  const isRenewIntent = focus === 'renew' || isLocked || creditExhausted;
  const isLevelChange = desiredLevel !== storageLevel;

  // Only a same-storage-level tier change (e.g. Basic → Standard just for
  // WhatsApp) keeps the current cycle running — pay the price difference,
  // expiry untouched. ANY storage-level change (2×/3× for more product/baki
  // room) always starts a fresh 30-day cycle at full price, same as a
  // renewal — matching what actually happens server-side.
  const isPureFeatureUpgrade = focus === 'upgrade' && hasActivePaidPlan && !isLevelChange && selectedPlan !== plan;

  const targetPrice = PLAN_BASE_PRICE[selectedPlan] * desiredLevel;
  const currentPrice = hasActivePaidPlan ? monthlyPrice : 0;
  const upgradeDiff = Math.max(0, targetPrice - currentPrice);

  const openPayment = () => {
    if (isPureFeatureUpgrade) {
      setShowPaymentFor({ plan: selectedPlan, level: desiredLevel, type: 'upgrade', amount: upgradeDiff });
    } else {
      setShowPaymentFor({ plan: selectedPlan, level: desiredLevel, type: 'new', amount: targetPrice });
    }
  };

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
            <p className="text-sm text-amber-700/90 dark:text-amber-200">নতুন বিক্রি বা বাকির আপডেট করতে প্ল্যান নবায়ন করুন। মেয়াদ শেষ হওয়ার আগেই এটা করা যায়।</p>
          </div>
        )}

        {hasActivePaidPlan && expiresAt && !creditExhausted && (
          <CountdownCard expiresAt={expiresAt} label={`আপনার ${PLAN_LABEL[plan]} প্ল্যানের মেয়াদ`} />
        )}

        {(hasActivePaidPlan || trialActive) && <div className="mb-4"><UsageDashboard /></div>}

        {/* ── Plan picker ────────────────────────────────────────────── */}
        <h2 className="text-lg font-bold text-foreground mb-1">
          {isPureFeatureUpgrade ? 'প্ল্যান আপগ্রেড করুন' : isRenewIntent ? 'প্ল্যান নবায়ন / সাবস্ক্রাইব করুন' : 'সব প্ল্যান দেখুন'}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">সহজ বাংলায়: যত বেশি ফিচার, দাম তত বেশি — কিন্তু পণ্য/বাকি/বিক্রির সীমা তিনটা প্ল্যানেই সমান।</p>

        <div className="space-y-3 mb-5">
          {PLAN_ORDER.map((p) => {
            const Icon = PLAN_ICON[p];
            const price = PLAN_BASE_PRICE[p] * desiredLevel;
            const selected = selectedPlan === p;
            const isCurrent = hasActivePaidPlan && plan === p && storageLevel === desiredLevel;
            return (
              <button
                key={p}
                onClick={() => setSelectedPlan(p)}
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
                {isCurrent && <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">বর্তমান প্ল্যান</span>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  <Feature ok label="১,০০০ × লেভেল পণ্য" />
                  <Feature ok label="১,০০০ × লেভেল বাকি হিসাব" />
                  <Feature ok label="১০,০০০ বিক্রি+বাকি (স্থির)" />
                  <Feature ok={p !== 'basic'} label="WhatsApp রিমাইন্ডার" />
                  <Feature ok={p === 'premium'} label="Invoice / PDF" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Storage level (capacity) selector */}
        <div className="rounded-2xl border border-border p-4 mb-6">
          <p className="font-semibold text-foreground mb-1">দোকানের সাইজ (ক্যাপাসিটি)</p>
          <p className="text-xs text-muted-foreground mb-3">বেশি পণ্য/বাকি হিসাব দরকার হলে লেভেল বাড়ান — দামও একই হারে বাড়বে। সর্বোচ্চ ১০×।</p>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(lvl => (
              <button
                key={lvl}
                onClick={() => setDesiredLevel(lvl)}
                className={`rounded-xl border-2 py-2.5 px-1 text-center transition-all ${desiredLevel === lvl ? 'border-primary bg-primary/5' : 'border-border'}`}
              >
                <p className="font-bold text-foreground text-sm">{toBn(lvl)}×</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{toBn((PRODUCT_UNIT * lvl).toLocaleString())} পণ্য</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{toBn((BAKI_UNIT * lvl).toLocaleString())} বাকি</p>
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-muted/50 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">{isPureFeatureUpgrade ? 'অতিরিক্ত দিতে হবে' : 'মোট দাম'}</span>
            <span className="text-2xl font-bold text-foreground">৳{toBn(isPureFeatureUpgrade ? upgradeDiff : targetPrice)}<span className="text-sm font-normal text-muted-foreground">/মাস</span></span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {isPureFeatureUpgrade
              ? 'শুধু ফিচার যোগ হচ্ছে — আপনার বর্তমান মেয়াদ (কতদিন বাকি আছে) অপরিবর্তিত থাকবে।'
              : 'নতুন ৩০ দিনের মেয়াদ আজ থেকে শুরু হবে এবং বিক্রি+বাকি-আপডেটের সীমাও রিসেট হবে।'}
          </p>
          <Button onClick={openPayment} className="w-full btn-primary py-6 rounded-xl text-base" disabled={isPureFeatureUpgrade && upgradeDiff <= 0}>
            {isPureFeatureUpgrade ? 'আপগ্রেড করুন' : isRenewIntent ? 'সাবস্ক্রাইব / নবায়ন করুন' : 'এই প্ল্যান নিন'}
          </Button>
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground mb-2">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <p>সাবস্ক্রিপশন ৩০ দিনের জন্য বৈধ থাকে। প্রতি ৩০ দিনে নবায়ন করতে হবে — অথবা বিক্রি+বাকি-আপডেটের সীমা আগেই শেষ হলে তখনই নবায়ন করতে হবে।</p>
        </div>
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
              onDone={() => setShowPaymentFor(null)}
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
