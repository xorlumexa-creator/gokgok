import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, Sparkles, Loader2, CreditCard, Smartphone, Lock, MessageCircle, PhoneCall, Gift, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { countries, Country, getCountryByCode, defaultCountry } from '@/data/countries';
import type { User } from '@supabase/supabase-js';
import logoImg from '@/assets/logo.png';

export default function Subscription() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'trial' | 'pro' | 'premium' | 'combo'>('trial');
  const [userCountry, setUserCountry] = useState<Country>(defaultCountry);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

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
        if (isExpired) setSelectedPlan('pro');
      }
    } catch (error) { console.error('Error checking trial:', error); }
  };

  const handleStartPlan = async () => {
    if (!user) { navigate('/auth'); return; }
    setLoading(true);
    try {
      if (selectedPlan === 'pro' || selectedPlan === 'premium' || selectedPlan === 'combo') {
        const price = selectedPlan === 'pro' ? userCountry.proPrice : selectedPlan === 'premium' ? userCountry.premiumPrice : userCountry.comboPrice;
        const period = selectedPlan === 'combo' ? '/বছর' : '/মাস';
        if (userCountry.code === 'BD') {
          toast({ title: "বিকাশ পেমেন্ট", description: `৳${price}${period} বিকাশ করুন: 01XXXXXXXXX (পেমেন্ট সিস্টেম শীঘ্রই আসছে)` });
        } else {
          toast({ title: "পেমেন্ট সিস্টেম শীঘ্রই আসছে", description: `${userCountry.currencySymbol}${price}${period}` });
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

  const proFeatures = [
    "সীমাহীন পণ্য যোগ করুন",
    "বাকির হিসাব রাখুন",
    "বাকির লাভ ট্র্যাকিং",
    "দৈনিক/সাপ্তাহিক/মাসিক রিপোর্ট",
    "একাধিক ইউনিটে বিক্রি",
    "ব্যক্তিগত ও দোকানের হিসাব আলাদা",
    "আগাম অর্ডার ব্যবস্থাপনা",
    "দাম উঠা-নামা পণ্য ট্র্যাকিং",
  ];

  const premiumExtras = [
    "WhatsApp রিমাইন্ডার",
    "সরাসরি কল বাটন",
  ];

  const getPrice = (plan: 'pro' | 'premium' | 'combo') => {
    const { currencySymbol, currency } = userCountry;
    if (plan === 'pro') {
      const price = userCountry.proPrice;
      return `${currency === 'BDT' ? '৳' : currencySymbol}${price}`;
    }
    if (plan === 'premium') {
      const price = userCountry.premiumPrice;
      return `${currency === 'BDT' ? '৳' : currencySymbol}${price}`;
    }
    const price = userCountry.comboPrice;
    return `${currency === 'BDT' ? '৳' : currencySymbol}${price}`;
  };

  const comboMonthlyEquivalent = Math.round(userCountry.comboPrice / 12);
  const comboDiscount = (userCountry.premiumPrice * 12) - userCountry.comboPrice;

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

        <div className="space-y-4 mb-6">
          {/* Free Trial */}
          {!isExpired && (
            <button
              onClick={() => setSelectedPlan('trial')}
              className={`w-full p-6 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${
                selectedPlan === 'trial' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              <div className="absolute top-0 right-0 bg-profit text-white px-3 py-1 rounded-bl-xl text-xs font-medium">প্রস্তাবিত</div>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedPlan === 'trial' ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Sparkles className={`w-6 h-6 ${selectedPlan === 'trial' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground">ফ্রি ট্রায়াল</h3>
                  <p className="text-muted-foreground text-sm">১৪ দিনের জন্য সব ফিচার ফ্রি</p>
                  <p className="text-3xl font-bold text-primary mt-2">{userCountry.currencySymbol}০</p>
                  <p className="text-xs text-muted-foreground">১৪ দিনের জন্য</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'trial' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                  {selectedPlan === 'trial' && <Check className="w-4 h-4 text-primary-foreground" />}
                </div>
              </div>
            </button>
          )}

          {/* Pro Plan - 60tk/month */}
          <button
            onClick={() => setSelectedPlan('pro')}
            className={`w-full p-6 rounded-2xl border-2 transition-all text-left ${
              selectedPlan === 'pro' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedPlan === 'pro' ? 'bg-primary/10' : 'bg-muted'}`}>
                <Crown className={`w-6 h-6 ${selectedPlan === 'pro' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground">প্রো প্ল্যান</h3>
                <p className="text-muted-foreground text-sm">সব ফিচার (WhatsApp ও কল ছাড়া)</p>
                <p className="text-3xl font-bold text-primary mt-2">
                  {getPrice('pro')}<span className="text-sm font-normal text-muted-foreground">/মাস</span>
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  <span>WhatsApp ও কল বাটন লক থাকবে</span>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'pro' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                {selectedPlan === 'pro' && <Check className="w-4 h-4 text-primary-foreground" />}
              </div>
            </div>
          </button>

          {/* Premium Plan - 120tk/month */}
          <button
            onClick={() => setSelectedPlan('premium')}
            className={`w-full p-6 rounded-2xl border-2 transition-all text-left ${
              selectedPlan === 'premium' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedPlan === 'premium' ? 'bg-primary/10' : 'bg-muted'}`}>
                <Crown className={`w-6 h-6 ${selectedPlan === 'premium' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground">প্রিমিয়াম প্ল্যান</h3>
                <p className="text-muted-foreground text-sm">সব ফিচার + WhatsApp + কল</p>
                <p className="text-3xl font-bold text-primary mt-2">
                  {getPrice('premium')}<span className="text-sm font-normal text-muted-foreground">/মাস</span>
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-profit">
                  <MessageCircle className="w-3 h-3" />
                  <span>WhatsApp রিমাইন্ডার + সরাসরি কল</span>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'premium' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                {selectedPlan === 'premium' && <Check className="w-4 h-4 text-primary-foreground" />}
              </div>
            </div>
          </button>

          {/* Combo Plan - Annual */}
          <button
            onClick={() => setSelectedPlan('combo')}
            className={`w-full p-6 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${
              selectedPlan === 'combo' ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <div className="absolute top-0 right-0 bg-gradient-to-l from-profit to-profit/80 text-white px-3 py-1 rounded-bl-xl text-xs font-bold flex items-center gap-1">
              <Gift className="w-3 h-3" />
              ৳{comboDiscount} সাশ্রয়!
            </div>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedPlan === 'combo' ? 'bg-primary/10' : 'bg-muted'}`}>
                <Calendar className={`w-6 h-6 ${selectedPlan === 'combo' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground">কম্বো প্ল্যান</h3>
                <p className="text-muted-foreground text-sm">সব ফিচার + WhatsApp + কল (বার্ষিক)</p>
                <p className="text-3xl font-bold text-primary mt-2">
                  {getPrice('combo')}<span className="text-sm font-normal text-muted-foreground">/বছর</span>
                </p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-profit">
                    <Gift className="w-3 h-3" />
                    <span>প্রিমিয়ামের সব ফিচার + ৳{comboDiscount} ছাড়!</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    মাসিক মাত্র ৳{comboMonthlyEquivalent} (প্রিমিয়ামে ৳{userCountry.premiumPrice}/মাস)
                  </p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'combo' ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                {selectedPlan === 'combo' && <Check className="w-4 h-4 text-primary-foreground" />}
              </div>
            </div>
          </button>
        </div>

        {/* Features */}
        <div className="card-elevated p-6 mb-6">
          <h4 className="font-semibold text-foreground mb-4">প্রো ফিচার:</h4>
          <ul className="space-y-3 mb-4">
            {proFeatures.map((f, i) => (
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
            প্রিমিয়াম/কম্বো এক্সট্রা:
          </h4>
          <ul className="space-y-3">
            {premiumExtras.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {i === 0 ? <MessageCircle className="w-3 h-3 text-primary" /> : <PhoneCall className="w-3 h-3 text-primary" />}
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