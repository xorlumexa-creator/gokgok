import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, User, MapPin, Mail, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { LocationPicker } from '@/components/auth/LocationPicker';
import { countries, Country, defaultCountry } from '@/data/countries';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import logoImg from '@/assets/logo.png';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  // Password recovery states
  const [recoveryStep, setRecoveryStep] = useState<'none' | 'warning' | 'email' | 'reset'>('none');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => { setUser(session?.user ?? null); }
    );
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) { setTimeout(() => { checkProfileAndRedirect(); }, 0); }
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
      if (profile?.subscription_status === 'trial') {
        const trialStart = new Date(profile.trial_start_date);
        const now = new Date();
        const daysPassed = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
        if (daysPassed >= 14) { navigate('/subscription'); return; }
      }
      if (profile?.subscription_status === 'trial' || profile?.subscription_status === 'active') {
        if (!profile?.shop_name) { navigate('/'); } else { navigate('/dashboard'); }
      } else { navigate('/subscription'); }
    } catch (error) { navigate('/subscription'); }
  };

  const getFullPhoneNumber = () => {
    const cleanPhone = phone.startsWith('0') ? phone.slice(1) : phone;
    return `${selectedCountry.dialCode}${cleanPhone}`;
  };

  const validateInputs = () => {
    if (!phone.trim() || phone.length < 8) { toast({ title: "সঠিক ফোন নম্বর দিন", variant: "destructive" }); return false; }
    if (!password || password.length < 6) { toast({ title: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে", variant: "destructive" }); return false; }
    if (!isLogin && !name.trim()) { toast({ title: "আপনার নাম দিন", variant: "destructive" }); return false; }
    if (!isLogin && !email.trim()) { toast({ title: "ইমেইল দিন", variant: "destructive" }); return false; }
    if (!isLogin && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast({ title: "সঠিক ইমেইল দিন", variant: "destructive" }); return false; }
    return true;
  };

  // Password recovery handlers
  const handleRecoveryRequest = async () => {
    if (!recoveryEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) {
      toast({ title: "সঠিক ইমেইল দিন", variant: "destructive" });
      return;
    }
    setRecoveryLoading(true);
    try {
      // Check if email exists in profiles
      const { data: profile } = await supabase.from('profiles').select('user_id').eq('email', recoveryEmail).maybeSingle();
      if (!profile) {
        toast({ title: "এই ইমেইল দিয়ে কোন অ্যাকাউন্ট পাওয়া যায়নি", variant: "destructive" });
        setRecoveryLoading(false);
        return;
      }
      
      // Record fine
      await supabase.from('fines').insert({ user_id: profile.user_id, amount: 10, reason: 'পাসওয়ার্ড ভুলে OTP অনুরোধ' });
      
      // Send password reset email via Supabase Auth
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
        redirectTo: `${window.location.origin}/auth?recovery=true`,
      });
      if (error) throw error;
      
      toast({ title: "রিসেট লিংক পাঠানো হয়েছে ✓", description: "আপনার ইমেইল চেক করুন। ১০ টাকা ফি যোগ হয়েছে 😅" });
      setRecoveryStep('reset');
    } catch (error: any) {
      toast({ title: error.message || "সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!validateInputs()) return;
    setLoading(true);
    try {
      const email = `${getFullPhoneNumber().replace(/\+/g, '')}@dokan360.app`;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Invalid login credentials')) { toast({ title: "ভুল ফোন নম্বর বা পাসওয়ার্ড", variant: "destructive" }); }
        else { toast({ title: error.message, variant: "destructive" }); }
        return;
      }
      toast({ title: "সফলভাবে লগইন হয়েছে! ✓" });
    } catch (error: any) { toast({ title: error.message || "লগইন করতে সমস্যা হয়েছে", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const handleSignup = async () => {
    if (!validateInputs()) return;
    setLoading(true);
    try {
      const fullPhone = getFullPhoneNumber();
      const email = `${fullPhone.replace(/\+/g, '')}@dokan360.app`;
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: name, phone: fullPhone, country: selectedCountry.code, address }
        }
      });
      if (error) {
        if (error.message.includes('User already registered')) { toast({ title: "এই ফোন নম্বর দিয়ে আগেই অ্যাকাউন্ট করা হয়েছে", variant: "destructive" }); }
        else { toast({ title: error.message, variant: "destructive" }); }
        return;
      }
      if (data.user) {
        await supabase.from('profiles').update({ phone: fullPhone, email: email }).eq('user_id', data.user.id);
      }
      toast({ title: "অ্যাকাউন্ট তৈরি হয়েছে! ✓", description: "১৪ দিনের ফ্রি ট্রায়াল শুরু হয়েছে" });
    } catch (error: any) { toast({ title: error.message || "অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  // Recovery warning modal
  if (recoveryStep === 'warning') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="card-elevated p-6 animate-fade-in text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-3">⚠️ সতর্কবার্তা</h2>
            <p className="text-muted-foreground mb-2">পাসওয়ার্ড রিকভারির জন্য আপনার ইমেইলে রিসেট লিংক পাঠানো হবে।</p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 my-4">
              <p className="text-destructive font-bold text-lg">এই সেবার জন্য ১০ টাকা ফি প্রযোজ্য!</p>
            </div>
            <div className="space-y-3 mt-6">
              <Button onClick={() => setRecoveryStep('email')} className="w-full py-5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                ১০ টাকা ফি দিয়ে রিসেট লিংক নিন
              </Button>
              <Button variant="outline" onClick={() => setRecoveryStep('none')} className="w-full py-5 rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-2" />ফিরে যান
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Recovery email input
  if (recoveryStep === 'email') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="card-elevated p-6 animate-fade-in">
            <div className="text-center mb-6">
              <Mail className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold text-foreground">ইমেইল দিন</h2>
              <p className="text-muted-foreground text-sm mt-1">আপনার রেজিস্ট্রেশনের সময় দেওয়া ইমেইল দিন</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2"><Mail className="w-4 h-4 inline mr-1" />ইমেইল</label>
                <input type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="your@email.com" className="input-field" autoFocus />
              </div>
              <Button onClick={handleRecoveryRequest} disabled={recoveryLoading} className="w-full py-5 rounded-xl">
                {recoveryLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                রিসেট লিংক পাঠান (৳১০ ফি)
              </Button>
              <Button variant="outline" onClick={() => setRecoveryStep('none')} className="w-full py-5 rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-2" />ফিরে যান
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Recovery success screen
  if (recoveryStep === 'reset') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="card-elevated p-6 animate-fade-in text-center">
            <Mail className="w-16 h-16 text-profit mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-3">📧 রিসেট লিংক পাঠানো হয়েছে</h2>
            <p className="text-muted-foreground mb-4">আপনার ইমেইলে একটি পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে। ইমেইল চেক করুন এবং লিংকে ক্লিক করুন।</p>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">⚠️ মনে রাখবেন: পাসওয়ার্ড নিরাপদ জায়গায় লিখে রাখুন। ভুলে গেলে আবার ১০ টাকা ফি দিতে হবে! 😄</p>
            </div>
            <Button onClick={() => { setRecoveryStep('none'); setRecoveryEmail(''); }} className="w-full py-5 rounded-xl">
              লগইন পেইজে ফিরে যান
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoImg} alt="ShopMate" className="w-20 h-20 rounded-2xl mx-auto mb-4 shadow-soft object-cover" />
          <h1 className="text-3xl font-bold text-foreground">ShopMate</h1>
          <p className="text-muted-foreground mt-2">আপনার দোকানের হিসাব রাখুন সহজে</p>
        </div>

        <div className="card-elevated p-6 animate-fade-in">
          <div className="flex gap-2 mb-6">
            <button onClick={() => setIsLogin(true)} className={`flex-1 py-3 rounded-xl font-medium transition-all ${isLogin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>লগইন</button>
            <button onClick={() => setIsLogin(false)} className={`flex-1 py-3 rounded-xl font-medium transition-all ${!isLogin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>নিবন্ধন</button>
          </div>

          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-2"><User className="w-4 h-4 inline mr-1" />আপনার নাম</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="পুরো নাম" className="input-field" autoComplete="name" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-2">WhatsApp ফোন নম্বর</label>
              <PhoneInput value={phone} onChange={setPhone} selectedCountry={selectedCountry} onCountryChange={setSelectedCountry} placeholder="1XXXXXXXXX" autoFocus={isLogin} />
            </div>
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-2"><Mail className="w-4 h-4 inline mr-1" />ইমেইল (পাসওয়ার্ড রিকভারির জন্য)</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="input-field" autoComplete="email" />
              </div>
            )}
            {!isLogin && <LocationPicker address={address} onAddressChange={setAddress} />}
            <div>
              <label className="block text-sm font-medium mb-2">পাসওয়ার্ড</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-field pl-10 pr-10" autoComplete={isLogin ? 'current-password' : 'new-password'} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password notice for signup */}
            {!isLogin && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">⚠️ গুরুত্বপূর্ণ: পাসওয়ার্ড নিরাপদ জায়গায় লিখে রাখুন। পাসওয়ার্ড ভুলে গেলে ইমেইলে রিসেট লিংক নিতে প্রতিবার ১০ টাকা ফি প্রযোজ্য!</p>
              </div>
            )}

            {/* Forgot password link for login */}
            {isLogin && (
              <button onClick={() => setRecoveryStep('warning')} className="text-sm text-primary hover:underline w-full text-right">
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            )}

            <Button onClick={isLogin ? handleLogin : handleSignup} disabled={loading} className="w-full btn-primary py-6 text-lg rounded-xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {isLogin ? 'লগইন করুন' : 'নিবন্ধন করুন'}
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? (
              <>অ্যাকাউন্ট নেই?{' '}<button onClick={() => setIsLogin(false)} className="text-primary hover:underline font-medium">নিবন্ধন করুন</button></>
            ) : (
              <>অ্যাকাউন্ট আছে?{' '}<button onClick={() => setIsLogin(true)} className="text-primary hover:underline font-medium">লগইন করুন</button></>
            )}
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">১৪ দিন ফ্রি ট্রায়াল সহ শুরু করুন</p>
      </div>
    </div>
  );
}