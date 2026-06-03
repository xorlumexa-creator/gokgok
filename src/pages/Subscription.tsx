import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Crown, Sparkles, Zap, TrendingUp, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import logoImg from '@/assets/logo.png';
import { useSubscription, toBn, PlanId, PLAN_BASE_PRICE, PLAN_LABEL, SALES_CREDIT_LIMIT, STORAGE_UNIT } from '@/context/SubscriptionContext';
import { UsageDashboard } from '@/components/subscription/UsageDashboard';
import { SubscriptionPaymentForm } from '@/components/SubscriptionPaymentForm';
import { useProfile } from '@/hooks/useProfile';

const PLAN_HIGHLIGHTS: Record<PlanId, { features: string[]; locked?: string[] }> = {
  basic: {
    features: [
      'পণ্য ও স্টক ম্যানেজমেন্ট',
      'বাকি (Baki) ব্যবস্থাপনা',
      'ব্যক্তিগত হিসাব',
      'বিক্রি ও খরচ ট্র্যাকিং',
    ],
    locked: ['WhatsApp ফিচার', 'Invoice ও PDF'],
  },
  standard: {
    features: [
      'Basic-এর সব ফিচার',
      'WhatsApp baki reminder',
      'কাস্টমার ও সাপ্লায়ার WhatsApp',
      'WhatsApp টেমপ্লেট',
    ],
    locked: ['Invoice ও PDF'],
  },
  pro: {
    features: [
      'Standard-এর সব ফিচার',
      'প্রিন্টযোগ্য Invoice',
      'PDF ইনভয়েস এক্সপোর্ট',
      'প্রফেশনাল receipt শেয়ার',
    ],
  },
};

function PlanCard({ id, selected, onSelect, monthlyPrice, isCurrent }: {
  id: PlanId; selected: boolean; onSelect: () => void; monthlyPrice: number; isCurrent: boolean;
}) {
  const Icon = id === 'basic' ? Crown : id === 'standard' ? Sparkles : Zap;
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
          <h3 className="font-bold text-foreground">{PLAN_LABEL[id]}</h3>
          <p className="text-2xl font-bold text-primary mt-1">৳{toBn(monthlyPrice)}<span className="text-xs font-normal text-muted-foreground">/মাস</span></p>
          <ul className="mt-3 space-y-1.5">
            {PLAN_HIGHLIGHTS[id].features.slice(0, 3).map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
          {selected && <Check className="w-3 h-3 text-primary-foreground" />}
        </div>
      </div>
    </button>
  );
}

export default function Subscription() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const focusUpgrade = params.get('focus') === 'upgrade';
  const { plan, storageLevel, monthlyPrice } = useSubscription();
  const { profile } = useProfile();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(plan);
  const [desiredLevel, setDesiredLevel] = useState<number>(storageLevel);
  const [showPayment, setShowPayment] = useState(false);
  const [authUser, setAuthUser] = useState<{ id: string; phone: string } | null>(null);

  useEffect(() => { setSelectedPlan(plan); }, [plan]);
  useEffect(() => { setDesiredLevel(storageLevel); }, [storageLevel]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) navigate('/auth');
      else setAuthUser({ id: session.user.id, phone: profile?.phone || session.user.phone || '' });
    });
  }, [navigate, profile?.phone]);

  const selectedBasePrice = PLAN_BASE_PRICE[selectedPlan];
  const selectedMonthly = selectedBasePrice * desiredLevel;
  const extraVsCurrent = Math.max(0, selectedMonthly - monthlyPrice);
  const isUpgrade = selectedMonthly > monthlyPrice || selectedPlan !== plan || desiredLevel !== storageLevel;

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
            <h1 className="text-xl font-bold text-foreground">{focusUpgrade ? 'প্ল্যান আপগ্রেড করুন' : 'সাবস্ক্রিপশন'}</h1>
          </div>
        </div>

        <div className="mb-6"><UsageDashboard compact /></div>

        <h2 className="font-bold text-foreground mb-3">আপনার প্ল্যান বেছে নিন</h2>
        <div className="grid gap-3 mb-6">
          {(['basic', 'standard', 'pro'] as PlanId[]).map(p => (
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
                      <p className="font-semibold text-foreground">{toBn((lvl * STORAGE_UNIT).toLocaleString())} টি পণ্য + {toBn((lvl * STORAGE_UNIT).toLocaleString())} টি বাকি হিসাব</p>
                      {lvl === 1 ? (
                        <p className="text-xs text-muted-foreground mt-1">ভিত্তিমূল্য অন্তর্ভুক্ত</p>
                      ) : (
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-medium">মাত্র ৳{toBn(extra)} অতিরিক্ত/মাস</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">৳{toBn(total)}<span className="text-[10px] font-normal text-muted-foreground">/মাস</span></p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-4 mb-6 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm text-foreground">
            প্রতিটি প্ল্যানে মাসিক <b>{toBn(SALES_CREDIT_LIMIT.toLocaleString())} টি বিক্রি</b> অন্তর্ভুক্ত। সীমা পূর্ণ হলে আবার নবায়ন করুন।
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
              {extraVsCurrent > 0 && (
                <p className="text-sm font-semibold text-primary">+৳{toBn(extraVsCurrent)} অতিরিক্ত</p>
              )}
            </div>
            <Button onClick={() => setShowPayment(true)} className="w-full py-6 text-base rounded-xl">
              {isUpgrade ? 'পেমেন্ট করে আপগ্রেড করুন' : 'পেমেন্ট করে নবায়ন করুন'}
            </Button>
            <p className="text-[10px] text-center text-muted-foreground mt-2">ম্যানেজার অনুমোদনের পর ৩০ দিনের জন্য সক্রিয় হবে</p>
          </div>
        </div>
      </div>
    </div>
  );
}

