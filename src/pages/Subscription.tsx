import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Crown, Zap, TrendingUp, ShieldCheck, ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import logoImg from '@/assets/logo.png';
import { useSubscription, toBn, PlanId, PLAN_BASE_PRICE, PLAN_LABEL, SALES_CREDIT_LIMIT, STORAGE_UNIT } from '@/context/SubscriptionContext';
import { UsageDashboard } from '@/components/subscription/UsageDashboard';
import { SubscriptionPaymentForm } from '@/components/SubscriptionPaymentForm';
import { useProfile } from '@/hooks/useProfile';
import { withTimeout } from '@/lib/asyncTimeout';
import { isOnline } from '@/lib/connectivity';

const PLAN_HIGHLIGHTS: Record<PlanId, { features: string[]; locked?: string[] }> = {
  basic: {
    features: [
      'পণ্য ও স্টক ম্যানেজমেন্ট',
      'বাকি (Baki) ব্যবস্থাপনা',
      'ব্যক্তিগত হিসাব',
      'বিক্রি ও খরচ ট্র্যাকিং',
      'প্রিন্টযোগ্য Invoice ও PDF এক্সপোর্ট',
    ],
    locked: ['WhatsApp ফিচার'],
  },
  pro: {
    features: [
      'Basic-এর সব ফিচার',
      'WhatsApp baki reminder',
      'কাস্টমার ও সাপ্লায়ার WhatsApp',
      'WhatsApp টেমপ্লেট',
    ],
  },
};

function PlanCard({ id, selected, onSelect, monthlyPrice, isCurrent }: {
  id: PlanId; selected: boolean; onSelect: () => void; monthlyPrice: number; isCurrent: boolean;
}) {
  const Icon = id === 'basic' ? Crown : Zap;
  return (
    <button onClick={onSelect}
      className={`w-full p-5 rounded-2xl border-2 text-left transition-all relative ${selected ? 'border-primary bg-primary/5 shadow-lg' : 'border-border bg-card hover:border-primary/40'}`}>
      {id === 'pro' && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 rounded-bl-xl rounded-tr-2xl text-[11px] font-semibold">🔥 সেরা</div>
      )}
      {isCurrent && (
        <div className="absolute -top-2 left-4 bg-emerald-500 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold">বর্তমান</div>
      )}
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${selected ? 'bg-primary/10' : 'bg-muted'}`}>
          <Icon className={`w-5 h-5 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between">
            <h3 className="font-bold text-foreground">{PLAN_LABEL[id]}</h3>
            <p className="text-lg font-bold text-foreground">৳{toBn(monthlyPrice)}<span className="text-xs font-normal text-muted-foreground">/মাস</span></p>
          </div>
        </div>
      </div>
    </button>
  );
}

function DaysRemainingCard({ daysRemaining, planLabel }: { daysRemaining: number; planLabel: string }) {
  return (
    <div className="card-elevated rounded-2xl p-5 mb-6 bg-card">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">আপনার {planLabel} প্ল্যানের মেয়াদ</p>
          <p className="text-xl font-bold text-foreground">
            {daysRemaining > 0 ? `আর ${toBn(daysRemaining)} দিন বাকি` : 'মেয়াদ শেষ হয়ে গেছে'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Subscription() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const focusUpgrade = params.get('focus') === 'upgrade';
  const { plan, storageLevel, monthlyPrice, expiresAt } = useSubscription();
  const { profile } = useProfile();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(plan);
  const [desiredLevel, setDesiredLevel] = useState<number>(storageLevel);
  const [showPayment, setShowPayment] = useState(false);
  const [showUpgradePayment, setShowUpgradePayment] = useState(focusUpgrade);
  const [authUser, setAuthUser] = useState<{ id: string; phone: string } | null>(null);

  useEffect(() => { setSelectedPlan(plan); }, [plan]);
  useEffect(() => { setDesiredLevel(storageLevel); }, [storageLevel]);

  useEffect(() => {
    withTimeout(supabase.auth.getSession(), 4000, 'subscription.page.getSession').then(({ data: { session } }) => {
      if (!session?.user) navigate('/auth');
      else setAuthUser({ id: session.user.id, phone: profile?.phone || session.user.phone || '' });
    }).catch(() => {
      if (!isOnline()) return;
      navigate('/auth');
    });
  }, [navigate, profile?.phone]);

  const hasExpiry = !!expiresAt;
  const daysRemaining = hasExpiry
    ? Math.max(0, Math.ceil((new Date(expiresAt as string).getTime() - Date.now()) / 86400000))
    : null;
  // A "purchased, currently running" plan — distinct from the context's
  // isPlanActive, which defaults to true when there's no expiry at all
  // (e.g. before any purchase). This must only be true when there's a
  // real, unexpired subscription — that's what blocks buying a second
  // new plan mid-cycle.
  const hasActivePaidPlan = hasExpiry && (daysRemaining as number) > 0;

  const selectedBasePrice = PLAN_BASE_PRICE[selectedPlan];
  const selectedMonthly = selectedBasePrice * desiredLevel;

  // Upgrade path: basic → pro, same storage level, paying only the
  // difference. The expiry date is intentionally left unchanged by the
  // approval logic — WhatsApp becomes usable only until the ORIGINAL
  // plan's expiry, not a fresh 30 days.
  const upgradeDiff = (PLAN_BASE_PRICE.pro - PLAN_BASE_PRICE.basic) * storageLevel;
  const canUpgrade = hasActivePaidPlan && plan === 'basic';

  if (showUpgradePayment && authUser && canUpgrade) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background p-4 md:p-6">
        <div className="max-w-md mx-auto">
          <button onClick={() => setShowUpgradePayment(false)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> ফিরে যান
          </button>
          <div className="mb-4">
            <h1 className="text-xl font-bold text-foreground">Pro-তে আপগ্রেড করুন</h1>
            <p className="text-sm text-muted-foreground mt-1">
              WhatsApp ফিচার আনলক করুন — মেয়াদ পরিবর্তন হবে না
            </p>
          </div>
          <SubscriptionPaymentForm
            userId={authUser.id}
            userPhone={authUser.phone}
            plan="pro"
            amount={`৳${toBn(upgradeDiff)}`}
            requestType="upgrade"
            amountTk={upgradeDiff}
            onDone={() => setTimeout(() => navigate('/dashboard'), 1500)}
          />
          <p className="text-[11px] text-center text-muted-foreground mt-4">
            ম্যানেজার অনুমোদনের পর WhatsApp ফিচার চালু হবে, আপনার বর্তমান মেয়াদ ({toBn(daysRemaining || 0)} দিন) অপরিবর্তিত থাকবে।
          </p>
        </div>
      </div>
    );
  }

  if (showPayment && authUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background p-4 md:p-6">
        <div className="max-w-md mx-auto">
          <button onClick={() => setShowPayment(false)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> ফিরে যান
          </button>
          <div className="mb-4">
            <h1 className="text-xl font-bold text-foreground">পেমেন্ট সম্পন্ন করুন</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {PLAN_LABEL[selectedPlan]} — ৳{toBn(selectedMonthly)}/মাস
            </p>
          </div>
          <SubscriptionPaymentForm
            userId={authUser.id}
            userPhone={authUser.phone}
            plan={selectedPlan}
            amount={`৳${toBn(selectedMonthly)}`}
            requestType="new"
            amountTk={selectedMonthly}
            onDone={() => setTimeout(() => navigate('/dashboard'), 1500)}
          />
          <p className="text-[11px] text-center text-muted-foreground mt-4">
            ম্যানেজার অনুমোদনের পর প্ল্যান সক্রিয় হবে। ততক্ষণ পর্যন্ত ২ দিনের ফ্রি অ্যাক্সেস দেওয়া হলো।
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <img src={logoImg} alt="Dukan 360°" className="w-12 h-12 rounded-2xl object-cover" />
          <div>
            <p className="text-xs text-primary font-semibold">Dukan 360°</p>
            <h1 className="text-xl font-bold text-foreground">সাবস্ক্রিপশন</h1>
          </div>
        </div>

        <div className="mb-6"><UsageDashboard compact /></div>

        {hasActivePaidPlan && (
          <DaysRemainingCard daysRemaining={daysRemaining as number} planLabel={PLAN_LABEL[plan]} />
        )}

        {hasActivePaidPlan ? (
          canUpgrade ? (
            <div className="card-elevated rounded-2xl p-5 mb-6 bg-card">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">Pro-তে আপগ্রেড করুন</h3>
                  <p className="text-xs text-muted-foreground">শুধু পার্থক্যের টাকা দিয়ে WhatsApp ফিচার আনলক করুন</p>
                </div>
              </div>
              <ul className="space-y-2 mb-4">
                {PLAN_HIGHLIGHTS.basic.locked?.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-emerald-600" /> {f}
                  </li>
                ))}
              </ul>
              <Button onClick={() => setShowUpgradePayment(true)} className="w-full py-6 text-base rounded-xl">
                ৳{toBn(upgradeDiff)} দিয়ে আপগ্রেড করুন
              </Button>
              <p className="text-[11px] text-center text-muted-foreground mt-2">
                মেয়াদ পরিবর্তন হবে না — আপনার বর্তমান {toBn(daysRemaining || 0)} দিনের জন্যই WhatsApp চালু হবে
              </p>
            </div>
          ) : (
            <div className="card-elevated rounded-2xl p-5 mb-6 bg-card text-center">
              <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <p className="font-bold text-foreground">আপনার {PLAN_LABEL[plan] || 'Pro'} প্ল্যান সক্রিয় আছে</p>
              <p className="text-xs text-muted-foreground mt-1">
                মেয়াদ শেষ না হওয়া পর্যন্ত নতুন প্ল্যান কেনার প্রয়োজন নেই
              </p>
            </div>
          )
        ) : (
          <>
            <h2 className="font-bold text-foreground mb-3">আপনার প্ল্যান বেছে নিন</h2>
            <div className="grid gap-3 mb-6">
              {(['basic', 'pro'] as PlanId[]).map(p => (
                <PlanCard key={p} id={p} selected={selectedPlan === p} onSelect={() => setSelectedPlan(p)}
                  monthlyPrice={PLAN_BASE_PRICE[p] * desiredLevel} isCurrent={plan === p && storageLevel === desiredLevel} />
              ))}
            </div>

            <div className="card-elevated rounded-2xl p-5 mb-6 bg-card">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">স্টোরেজ সাইজ</h3>
                  <p className="text-xs text-muted-foreground">আপনার দোকানের আকার অনুযায়ী বেছে নিন</p>
                </div>
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map(lvl => {
                  const extra = (lvl - 1) * selectedBasePrice;
                  const total = lvl * selectedBasePrice;
                  const isSel = desiredLevel === lvl;
                  return (
                    <button key={lvl} onClick={() => setDesiredLevel(lvl)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${isSel ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/40'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">লেভেল {lvl} ({toBn(lvl * STORAGE_UNIT)} পণ্য/বাকি পর্যন্ত)</p>
                          {extra > 0 && <p className="text-xs text-muted-foreground">+৳{toBn(extra)}</p>}
                        </div>
                        <p className="font-bold text-foreground">৳{toBn(total)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card-elevated rounded-2xl p-5 mb-6 bg-card">
              <h3 className="font-bold text-foreground mb-3">{PLAN_LABEL[selectedPlan]} প্ল্যানে যা পাবেন</h3>
              <ul className="space-y-2">
                {PLAN_HIGHLIGHTS[selectedPlan].features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-emerald-600" /> {f}
                  </li>
                ))}
                {PLAN_HIGHLIGHTS[selectedPlan].locked?.map((f, i) => (
                  <li key={`l${i}`} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-4 h-4 inline-flex items-center justify-center">🔒</span> {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="sticky bottom-4 z-10">
              <div className="card-elevated rounded-2xl p-4 bg-card shadow-xl">
                <div className="flex items-baseline justify-between mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">মাসিক মূল্য</p>
                    <p className="text-2xl font-bold text-foreground">৳{toBn(selectedMonthly)}<span className="text-xs font-normal text-muted-foreground">/মাস</span></p>
                  </div>
                </div>
                <Button onClick={() => setShowPayment(true)} className="w-full py-6 text-base rounded-xl">
                  পেমেন্ট করে শুরু করুন
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
