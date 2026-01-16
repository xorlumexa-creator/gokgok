import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Check, Crown, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { User } from '@supabase/supabase-js';

export default function Subscription() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'trial' | 'monthly'>('trial');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate('/auth');
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleStartPlan = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: selectedPlan === 'trial' ? 'trial' : 'active',
          trial_start_date: new Date().toISOString(),
          subscription_start_date: selectedPlan === 'monthly' ? new Date().toISOString() : null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: selectedPlan === 'trial' 
          ? "৭ দিনের ফ্রি ট্রায়াল শুরু হয়েছে! 🎉" 
          : "সাবস্ক্রিপশন সক্রিয় হয়েছে! 🎉"
      });
      
      navigate('/');
    } catch (error: any) {
      toast({ title: error.message || "সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    "সীমাহীন পণ্য যোগ করুন",
    "বাকির হিসাব রাখুন",
    "লাভ-ক্ষতি হিসাব",
    "দৈনিক/সাপ্তাহিক/মাসিক রিপোর্ট",
    "একাধিক ইউনিটে বিক্রি (কেজি/পিস/হালি/ডজন)",
    "বেক্তিগত ও দোকানের হিসাব আলাদা",
    "অপেমেন্ট গ্রাহকদের নোটিফিকেশন",
    "ফেরত হিসাব ক্যালকুলেটর"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-soft">
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">সাবস্ক্রিপশন বেছে নিন</h1>
          <p className="text-muted-foreground mt-1">আপনার দোকান পরিচালনা করুন স্মার্টভাবে</p>
        </div>

        {/* Plan Cards */}
        <div className="space-y-4 mb-6">
          {/* Free Trial */}
          <button
            onClick={() => setSelectedPlan('trial')}
            className={`w-full p-6 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${
              selectedPlan === 'trial'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <div className="absolute top-0 right-0 bg-profit text-profit-foreground px-3 py-1 rounded-bl-xl text-xs font-medium">
              প্রস্তাবিত
            </div>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedPlan === 'trial' ? 'bg-primary/10' : 'bg-muted'
              }`}>
                <Sparkles className={`w-6 h-6 ${selectedPlan === 'trial' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground">ফ্রি ট্রায়াল</h3>
                <p className="text-muted-foreground text-sm">৭ দিনের জন্য সব ফিচার ফ্রি</p>
                <p className="text-3xl font-bold text-primary mt-2">৳০</p>
                <p className="text-xs text-muted-foreground">৭ দিনের জন্য</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedPlan === 'trial'
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground'
              }`}>
                {selectedPlan === 'trial' && <Check className="w-4 h-4 text-primary-foreground" />}
              </div>
            </div>
          </button>

          {/* Monthly Plan */}
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`w-full p-6 rounded-2xl border-2 transition-all text-left ${
              selectedPlan === 'monthly'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                selectedPlan === 'monthly' ? 'bg-primary/10' : 'bg-muted'
              }`}>
                <Crown className={`w-6 h-6 ${selectedPlan === 'monthly' ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground">মাসিক প্ল্যান</h3>
                <p className="text-muted-foreground text-sm">সব ফিচার সীমাহীন ব্যবহার করুন</p>
                <p className="text-3xl font-bold text-primary mt-2">৳৫০<span className="text-sm font-normal text-muted-foreground">/মাস</span></p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedPlan === 'monthly'
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground'
              }`}>
                {selectedPlan === 'monthly' && <Check className="w-4 h-4 text-primary-foreground" />}
              </div>
            </div>
          </button>
        </div>

        {/* Features List */}
        <div className="card-elevated p-6 mb-6">
          <h4 className="font-semibold text-foreground mb-4">সব ফিচার পাবেন:</h4>
          <ul className="space-y-3">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-profit/10 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-profit" />
                </div>
                <span className="text-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleStartPlan}
          disabled={loading}
          className="w-full btn-primary py-6 text-lg rounded-xl"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : null}
          {selectedPlan === 'trial' ? 'ফ্রি ট্রায়াল শুরু করুন' : 'সাবস্ক্রাইব করুন'}
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {selectedPlan === 'trial' 
            ? "কোন কার্ড লাগবে না • যেকোনো সময় বাতিল করুন"
            : "নিরাপদ পেমেন্ট • যেকোনো সময় বাতিল করুন"
          }
        </p>
      </div>
    </div>
  );
}
