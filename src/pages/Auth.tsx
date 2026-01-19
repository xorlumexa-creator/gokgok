import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Lock, Eye, EyeOff, Loader2, User, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { LocationPicker } from '@/components/auth/LocationPicker';
import { countries, Country, defaultCountry } from '@/data/countries';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  
  // Signup fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      setTimeout(() => {
        checkProfileAndRedirect();
      }, 0);
    }
  }, [user]);

  const checkProfileAndRedirect = async () => {
    if (!user) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_status, trial_start_date, shop_name')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Check if trial expired or subscription needed
      if (profile?.subscription_status === 'trial') {
        const trialStart = new Date(profile.trial_start_date);
        const now = new Date();
        const daysPassed = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysPassed >= 7) {
          // Trial expired
          navigate('/subscription');
          return;
        }
      }

      if (profile?.subscription_status === 'trial' || profile?.subscription_status === 'active') {
        // Check if onboarding is complete
        if (!profile?.shop_name) {
          navigate('/');
        } else {
          navigate('/dashboard');
        }
      } else {
        navigate('/subscription');
      }
    } catch (error) {
      navigate('/subscription');
    }
  };

  const getFullPhoneNumber = () => {
    const cleanPhone = phone.startsWith('0') ? phone.slice(1) : phone;
    return `${selectedCountry.dialCode}${cleanPhone}`;
  };

  const validateInputs = () => {
    if (!phone.trim() || phone.length < 8) {
      toast({ title: "সঠিক ফোন নম্বর দিন", variant: "destructive" });
      return false;
    }
    if (!password || password.length < 6) {
      toast({ title: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে", variant: "destructive" });
      return false;
    }
    if (!isLogin) {
      if (!name.trim()) {
        toast({ title: "আপনার নাম দিন", variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateInputs()) return;
    
    setLoading(true);
    try {
      // Create email from phone for Supabase auth
      const email = `${getFullPhoneNumber().replace(/\+/g, '')}@dokan360.app`;
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({ title: "ভুল ফোন নম্বর বা পাসওয়ার্ড", variant: "destructive" });
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
      const fullPhone = getFullPhoneNumber();
      const email = `${fullPhone.replace(/\+/g, '')}@dokan360.app`;
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: name,
            phone: fullPhone,
            country: selectedCountry.code,
            address: address,
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast({ title: "এই ফোন নম্বর দিয়ে আগেই অ্যাকাউন্ট করা হয়েছে", variant: "destructive" });
        } else {
          toast({ title: error.message, variant: "destructive" });
        }
        return;
      }

      // Update profile with additional info
      if (data.user) {
        await supabase.from('profiles').update({
          phone: fullPhone,
          email: email,
        }).eq('user_id', data.user.id);
      }

      toast({ 
        title: "অ্যাকাউন্ট তৈরি হয়েছে! ✓",
        description: "৭ দিনের ফ্রি ট্রায়াল শুরু হয়েছে"
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
          <h1 className="text-3xl font-bold text-foreground">ShopMate</h1>
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
            {/* Signup - Name */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  আপনার নাম
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="পুরো নাম"
                  className="input-field"
                  autoComplete="name"
                />
              </div>
            )}

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium mb-2">WhatsApp ফোন নম্বর</label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                selectedCountry={selectedCountry}
                onCountryChange={setSelectedCountry}
                placeholder="1XXXXXXXXX"
                autoFocus={isLogin}
              />
            </div>

            {/* Signup - Address */}
            {!isLogin && (
              <LocationPicker
                address={address}
                onAddressChange={setAddress}
              />
            )}

            {/* Password */}
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
