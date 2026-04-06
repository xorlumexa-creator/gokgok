import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, Sparkles, Loader2, CreditCard, Smartphone, Lock, MessageCircle, PhoneCall, ChevronDown, Zap, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { countries, Country, getCountryByCode, defaultCountry } from '@/data/countries';
import type { User } from '@supabase/supabase-js';
import logoImg from '@/assets/logo.png';

const MONTH_OPTIONS = [1, 2, 3, 4, 5, 6, 12];

export default function Subscription() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'trial' | 'basic' | 'standard' | 'pro'>('trial');
  const [userCountry, setUserCountry] = useState<Country>(defaultCountry);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [months, setMonths] = useState(1);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate('/auth');
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) { navigate('/auth'); }
      else {
        const country = session.user.user_metadata?.country;
        if (country) { const f = getCountryByCode(country); if (f) setUserCountry(f); }
        checkTrialStatus(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkTrialStatus = async (userId: string) => {
    try {
      const { data: profile } = await supabase.from('profiles').select('subscription_status, trial_start_date').eq('user_id', userId).single();
      if (profile?.trial_start_date) {
        const trialStart = new Date(profile.trial_start_date);
        const now = new Date();
        const daysPassed = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
        const daysLeft = Math.max(0, 14 - daysPassed);
        setTrialDaysLeft(daysLeft);
        setIsExpired(daysLeft === 0 && profile.subscription_status !== 'active');
        if (isExpired) setSelectedPlan('basic');
      }
    } catch (error) { console.error('Error checking trial:', error); }
  };

  const handleStartPlan = async () => {
    if (!user) { navigate('/auth'); return; }
    setLoading(true);
    try {
      if (selectedPlan === 'basic' || selectedPlan === 'standard' || selectedPlan === 'pro') {
        const basePrice = selectedPlan === 'basic' ? userCountry.basicPrice : selectedPlan === 'standard' ? userCountry.standardPrice : userCountry.proPrice;
        const totalPrice = basePrice * months;
        const period = months === 1 ? '/মাস' : ` (${months} মাস)`;
        if (userCountry.code === 'BD') {
          toast({ title: "বিকাশ পেমেন্ট", description: `৳${totalPrice}${period} বিকাশ করুন: 01XXXXXXXXX (পেমেন্ট সিস্টেম শীঘ্রই আসছে)` });
        } else {
          toast({ title: "পেমেন্ট সিস্টেম শীঘ্রই আসছে", description: `${userCountry.currencySymbol}${totalPrice}${period}` });
        }
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('profiles').update({
        subscription_status: 'trial',
        trial_start_date: new Date().toISOString(),
      }).eq('user_id', user.id);
      if (error) throw error;
      toast({ title: "১৪ দিনের ফ্রি ট্রায়াল শুরু হয়েছে! 🎉" });
      navigate('/');
    } catch (error: any) { toast({ title: error.message || "সমস্যা হয়েছে", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const basicFeatures = [
    "সীমাহীন পণ্য যোগ করুন (১,০০০ পর্যন্ত)",
    "বাকির হিসাব রাখুন (১,০০০ গ্রাহক)",
    "দৈনিক ৫০০ বিক্রি",
    "বাকির লাভ ট্র্যাকিং",
    "দৈনিক/সাপ্তাহিক/মাসিক রিপোর্ট",
    "একাধিক ইউনিটে বিক্রি",
    "ব্যক্তিগত ও দোকানের হিসাব আলাদা",
    "আগাম অর্ডার ব্যবস্থাপনা",
    "দাম উঠা-নামা পণ্য ট্র্যাকিং",
  ];

  const standardExtras = [
    "WhatsApp রিমাইন্ডার",
    "সরাসরি কল বাটন",
    "WhatsApp মেসেজ টেমপ্লেট",
  ];

  const proExtras = [
    "ইনভয়েস তৈরি, প্রিন্ট ও WhatsApp এ পাঠান",
    "PDF এক্সপোর্ট",
    "WhatsApp রিমাইন্ডার ও কল",
  ];

  const getPrice = (plan: 'basic' | 'standard' | 'pro') => {
    const { currencySymbol, currency } = userCountry;
    const base = plan === 'basic' ? userCountry.basicPrice : plan === 'standard' ? userCountry.standardPrice : userCountry.proPrice;
    const sym = currency === 'BDT' ? '৳' : currencySymbol;
    return `${sym}${base * months}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img src={logoImg} alt="Dukan 360°" className="w-16 h-16 rounded-2xl mx-auto mb-3 shadow-soft object-cover" />
          <p className="text-sm text-primary font-medium mb-2">Dukan 360°</p>
          <h1 className="text-2xl font-bold text-foreground">
            {isExpired ? 'ট্রায়াল শেষ হয়েছে' : 'সাবস্ক্রিপশন বেছে নিন'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isExpired ? 'চালিয়ে যেতে সাবস্ক্রাইব করুন' : 'আপনার দোকান পরিচালনা করুন স্মার্টভাবে'}
          </p>
          {trialDaysLeft !== null && trialDaysLeft > 0 && (
            <div className="mt-3 inline-block px-4 py-2 bg-primary/10 rounded-full">
              <span className="text-primary font-medium">⏰ {trialDaysLeft} দিন বাকি</span>
            </div>
          )}
        </div>

        {/* Month Selector */}
        {(selectedPlan === 'basic' || selectedPlan === 'standard' || selectedPlan === 'pro') && (
          <div className="mb-4 p-4 card-elevated rounded-2xl">
            <label className="block text-sm font-medium text-foreground mb-2">কত মাসের জন্য?</label>
            <div className="relative">
              <select value={months} onChange={(e) => setMonths(parseInt(e.target.value))}
                className="w-full py-3 px-4 rounded-xl border border-border bg-background text-foreground appearance-none text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary">
                {MONTH_OPTIONS.map(m => (
                  <option key={m} value={m}>{m === 12 ? '১২ মাস (১ বছর)' : `${m} মাস`}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        )}

        <div className="space-y-4 mb-6">
          {/* Free Trial */}
          {!isExpired && (
            <button onClick={() => setSelectedPlan('trial')}
              className={`w-full p-6 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${selectedPlan === 'trial' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'}`}>
              <div className="absolute top-0 right-0 bg-profit text-white px-3 py-1 rounded-bl-xl text-xs font-medium">প্রস্তাবিত</div>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedPlan === 'trial' ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Sparkles className={`w-6 h-6 ${selectedPlan === 'trial' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground">ফ্রি ট্রায়াল</h3>
                  <p className="text-muted-foreground text-sm">১৪ দিনের জন্য সব ফিচার ফ্রি</p>
                  <p className="text-3xl font-bold text-primary mt-2">{userCountry.currencySymbol}০</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'trial' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                  {selectedPlan === 'trial' && <Check className="w-4 h-4 text-primary-foreground" />}
                </div>
              </div>
            </button>
          )}

          {/* Basic Plan */}
          <button onClick={() => setSelectedPlan('basic')}
            className={`w-full p-6 rounded-2xl border-2 transition-all text-left ${selectedPlan === 'basic' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedPlan === 'basic' ? 'bg-primary/10' : 'bg-muted'}`}>
                <Crown className={`w-6 h-6 ${selectedPlan === 'basic' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground">বেসিক প্ল্যান</h3>
                <p className="text-muted-foreground text-sm">মূল ফিচার (WhatsApp ও ইনভয়েস ছাড়া)</p>
                <p className="text-3xl font-bold text-primary mt-2">
                  {getPrice('basic')}<span className="text-sm font-normal text-muted-foreground">/{months > 1 ? `${months} মাস` : 'মাস'}</span>
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  <span>WhatsApp, কল ও ইনভয়েস লক থাকবে</span>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'basic' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                {selectedPlan === 'basic' && <Check className="w-4 h-4 text-primary-foreground" />}
              </div>
            </div>
          </button>

          {/* Standard Plan */}
          <button onClick={() => setSelectedPlan('standard')}
            className={`w-full p-6 rounded-2xl border-2 transition-all text-left ${selectedPlan === 'standard' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedPlan === 'standard' ? 'bg-primary/10' : 'bg-muted'}`}>
                <Crown className={`w-6 h-6 ${selectedPlan === 'standard' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground">স্ট্যান্ডার্ড প্ল্যান</h3>
                <p className="text-muted-foreground text-sm">সব ফিচার + WhatsApp + কল</p>
                <p className="text-3xl font-bold text-primary mt-2">
                  {getPrice('standard')}<span className="text-sm font-normal text-muted-foreground">/{months > 1 ? `${months} মাস` : 'মাস'}</span>
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-profit">
                  <MessageCircle className="w-3 h-3" />
                  <span>WhatsApp রিমাইন্ডার + সরাসরি কল</span>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'standard' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                {selectedPlan === 'standard' && <Check className="w-4 h-4 text-primary-foreground" />}
              </div>
            </div>
          </button>

          {/* Pro Plan */}
          <button onClick={() => setSelectedPlan('pro')}
            className={`w-full p-6 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${selectedPlan === 'pro' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'}`}>
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 rounded-bl-xl text-xs font-medium">🔥 সেরা</div>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedPlan === 'pro' ? 'bg-primary/10' : 'bg-muted'}`}>
                <Zap className={`w-6 h-6 ${selectedPlan === 'pro' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground">প্রো প্ল্যান</h3>
                <p className="text-muted-foreground text-sm">সব ফিচার + ইনভয়েস + WhatsApp + কল</p>
                <p className="text-3xl font-bold text-primary mt-2">
                  {getPrice('pro')}<span className="text-sm font-normal text-muted-foreground">/{months > 1 ? `${months} মাস` : 'মাস'}</span>
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-profit">
                  <Receipt className="w-3 h-3" />
                  <span>ইনভয়েস + WhatsApp + কল সব আনলক</span>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'pro' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                {selectedPlan === 'pro' && <Check className="w-4 h-4 text-primary-foreground" />}
              </div>
            </div>
          </button>
        </div>

        {/* Limits info */}
        <div className="card-elevated p-4 mb-4 bg-primary/5 rounded-2xl">
          <p className="text-sm font-medium text-foreground mb-2">📊 প্রতিটি প্ল্যানের সীমা:</p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-background rounded-lg">
              <p className="font-bold text-foreground">৫০০</p>
              <p className="text-muted-foreground">দৈনিক বিক্রি</p>
            </div>
            <div className="p-2 bg-background rounded-lg">
              <p className="font-bold text-foreground">১,০০০</p>
              <p className="text-muted-foreground">পণ্য তালিকা</p>
            </div>
            <div className="p-2 bg-background rounded-lg">
              <p className="font-bold text-foreground">১,০০০</p>
              <p className="text-muted-foreground">বাকি গ্রাহক</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            সীমা বাড়াতে চাইলে দ্বিগুণ মূল্যে দ্বিগুণ সুবিধা পান!
          </p>
        </div>

        {/* Features */}
        <div className="card-elevated p-6 mb-6">
          <h4 className="font-semibold text-foreground mb-4">বেসিক ফিচার:</h4>
          <ul className="space-y-3 mb-4">
            {basicFeatures.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-profit/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-profit" />
                </div>
                <span className="text-foreground">{f}</span>
              </li>
            ))}
          </ul>
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            স্ট্যান্ডার্ড এক্সট্রা:
          </h4>
          <ul className="space-y-3 mb-4">
            {standardExtras.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {i === 0 ? <MessageCircle className="w-3 h-3 text-primary" /> : <PhoneCall className="w-3 h-3 text-primary" />}
                </div>
                <span className="text-foreground">{f}</span>
              </li>
            ))}
          </ul>
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            প্রো এক্সট্রা:
          </h4>
          <ul className="space-y-3">
            {proExtras.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {i === 0 ? <Receipt className="w-3 h-3 text-primary" /> : i === 1 ? <MessageCircle className="w-3 h-3 text-primary" /> : <PhoneCall className="w-3 h-3 text-primary" />}
                </div>
                <span className="text-foreground">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Payment methods */}
        <div className="card-elevated p-4 mb-6">
          <p className="text-xs text-muted-foreground mb-2">পেমেন্ট মাধ্যম:</p>
          <div className="flex gap-2">
            {userCountry.code === 'BD' && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#E2136E]/10 rounded-lg">
                <Smartphone className="w-4 h-4 text-[#E2136E]" />
                <span className="text-sm font-medium text-[#E2136E]">বিকাশ</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{userCountry.code === 'BD' ? 'শীঘ্রই আসছে' : 'কার্ড (শীঘ্রই)'}</span>
            </div>
          </div>
        </div>

        <Button onClick={handleStartPlan} disabled={loading} className="w-full btn-primary py-6 text-lg rounded-xl">
          {loading && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
          {selectedPlan === 'trial' && !isExpired ? 'ফ্রি ট্রায়াল শুরু করুন' : 'সাবস্ক্রাইব করুন'}
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {selectedPlan === 'trial' && !isExpired ? "কোন কার্ড লাগবে না • যেকোনো সময় বাতিল করুন" : "নিরাপদ পেমেন্ট • যেকোনো সময় বাতিল করুন"}
        </p>
      </div>
    </div>
  );
}
