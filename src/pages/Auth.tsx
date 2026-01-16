import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { User, Session } from '@supabase/supabase-js';

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      // Check subscription status and redirect accordingly
      setTimeout(() => {
        checkSubscriptionStatus();
      }, 0);
    }
  }, [user]);

  const checkSubscriptionStatus = async () => {
    if (!user) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_status, trial_start_date')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (profile?.subscription_status === 'trial' || profile?.subscription_status === 'active') {
        navigate('/dashboard');
      } else {
        navigate('/subscription');
      }
    } catch (error) {
      // If profile doesn't exist, redirect to subscription
      navigate('/subscription');
    }
  };

  const validateInputs = () => {
    if (!email.trim()) {
      toast({ title: "ইমেইল দিন", variant: "destructive" });
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "সঠিক ইমেইল দিন", variant: "destructive" });
      return false;
    }
    if (!password || password.length < 6) {
      toast({ title: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateInputs()) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({ title: "ভুল ইমেইল বা পাসওয়ার্ড", variant: "destructive" });
        } else {
          toast({ title: error.message, variant: "destructive" });
        }
        return;
      }

      toast({ title: "সফলভাবে লগইন হয়েছে! ✓" });
    } catch (error: any) {
      toast({ title: error.message || "লগইন করতে সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!validateInputs()) return;
    
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast({ title: "এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট করা হয়েছে", variant: "destructive" });
        } else {
          toast({ title: error.message, variant: "destructive" });
        }
        return;
      }

      toast({ 
        title: "অ্যাকাউন্ট তৈরি হয়েছে! ✓",
        description: "এখন সাবস্ক্রিপশন বেছে নিন"
      });
    } catch (error: any) {
      toast({ title: error.message || "অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft">
            <Store className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Dokan 360</h1>
          <p className="text-muted-foreground mt-2">আপনার দোকানের হিসাব রাখুন সহজে</p>
        </div>

        {/* Auth Card */}
        <div className="card-elevated p-6 animate-fade-in">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                isLogin 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              লগইন
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                !isLogin 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              নিবন্ধন
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">ইমেইল</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input-field pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">পাসওয়ার্ড</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10 pr-10"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              onClick={isLogin ? handleLogin : handleSignup}
              disabled={loading}
              className="w-full btn-primary py-6 text-lg rounded-xl"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              {isLogin ? 'লগইন করুন' : 'নিবন্ধন করুন'}
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? (
              <>
                অ্যাকাউন্ট নেই?{' '}
                <button onClick={() => setIsLogin(false)} className="text-primary hover:underline font-medium">
                  নিবন্ধন করুন
                </button>
              </>
            ) : (
              <>
                অ্যাকাউন্ট আছে?{' '}
                <button onClick={() => setIsLogin(true)} className="text-primary hover:underline font-medium">
                  লগইন করুন
                </button>
              </>
            )}
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          ৭ দিন ফ্রি ট্রায়াল সহ শুরু করুন
        </p>
      </div>
    </div>
  );
}
