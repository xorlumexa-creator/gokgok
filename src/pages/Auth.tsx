import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, User, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { FaceCapture } from '@/components/auth/FaceCapture';
import { RecoveryFlow } from '@/components/auth/RecoveryFlow';
import { countries, Country, defaultCountry } from '@/data/countries';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import logoImg from '@/assets/logo.png';

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup' | 'recovery'>('login');
  const [signupStep, setSignupStep] = useState<'info' | 'face'>('info');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  const [name, setName] = useState('');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => { setUser(session?.user ?? null); }
    );
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && signupStep !== 'face') {
      setTimeout(() => checkProfileAndRedirect(), 0);
    }
  }, [user, signupStep]);

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
    } catch { navigate('/subscription'); }
  };

  const getFullPhoneNumber = () => {
    const cleanPhone = phone.startsWith('0') ? phone.slice(1) : phone;
    return `${selectedCountry.dialCode}${cleanPhone}`;
  };

  const validateLogin = () => {
    if (!phone.trim() || phone.length < 8) { toast({ title: "সঠিক ফোন নম্বর দিন", variant: "destructive" }); return false; }
    if (!password || password.length < 6) { toast({ title: "পাসওয়ার্ড দিন", variant: "destructive" }); return false; }
    return true;
  };

  const validateSignup = () => {
    if (!name.trim()) { toast({ title: "আপনার নাম দিন", variant: "destructive" }); return false; }
    if (!phone.trim() || phone.length < 8) { toast({ title: "সঠিক ফোন নম্বর দিন", variant: "destructive" }); return false; }
    if (!password || password.length < 8) { toast({ title: "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে", variant: "destructive" }); return false; }
    if (!/[0-9]/.test(password)) { toast({ title: "পাসওয়ার্ডে কমপক্ষে ১টি সংখ্যা থাকতে হবে", variant: "destructive" }); return false; }
    if (password !== confirmPassword) { toast({ title: "পাসওয়ার্ড মিলছে না", variant: "destructive" }); return false; }
    return true;
  };

  const handleLogin = async () => {
    if (!validateLogin()) return;
    setLoading(true);
    try {
      const authEmail = `${getFullPhoneNumber().replace(/\+/g, '')}@dokan360.app`;
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({ title: "ভুল ফোন নম্বর বা পাসওয়ার্ড", variant: "destructive" });
        } else {
          toast({ title: error.message, variant: "destructive" });
        }
        return;
      }
      toast({ title: "সফলভাবে লগইন হয়েছে! ✓" });
    } catch (e: any) {
      toast({ title: e.message || "লগইন করতে সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!validateSignup()) return;
    setLoading(true);
    try {
      const fullPhone = getFullPhoneNumber();
      const authEmail = `${fullPhone.replace(/\+/g, '')}@dokan360.app`;
      const { data, error } = await supabase.auth.signUp({
        email: authEmail, password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: name, phone: fullPhone, country: selectedCountry.code }
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
      if (data.user) {
        setPendingUserId(data.user.id);
        await supabase.from('profiles').update({
          phone: fullPhone,
          full_name: name.trim(),
          whatsapp_number: fullPhone
        }).eq('user_id', data.user.id);
        
        // Move to face capture step
        setSignupStep('face');
        toast({ title: "অ্যাকাউন্ট তৈরি হয়েছে! ✓", description: "এখন মুখের ছবি তুলুন" });
      }
    } catch (e: any) {
      toast({ title: e.message || "অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFaceCapture = async (descriptor: number[]) => {
    if (!pendingUserId && !user) return;
    const uid = pendingUserId || user?.id;
    try {
      await supabase.from('profiles').update({
        face_descriptor: descriptor as any,
        face_registered_at: new Date().toISOString()
      }).eq('user_id', uid);
      toast({ title: "মুখের ছবি সেভ হয়েছে ✓" });
    } catch (e) {
      console.error('Failed to save face descriptor:', e);
    }
    setSignupStep('info');
    checkProfileAndRedirect();
  };

  const handleSkipFace = () => {
    setSignupStep('info');
    checkProfileAndRedirect();
  };

  if (mode === 'recovery') {
    return <RecoveryFlow onBack={() => setMode('login')} />;
  }

  if (signupStep === 'face') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="card-elevated p-6 animate-fade-in">
            <FaceCapture onCapture={handleFaceCapture} onSkip={handleSkipFace} />
          </div>
        </div>
      </div>
    );
  }

  const isLogin = mode === 'login';

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoImg} alt="Dukan 360°" className="w-20 h-20 rounded-2xl mx-auto mb-4 shadow-soft object-cover" />
          <h1 className="text-3xl font-bold text-foreground">Dukan 360°</h1>
          <p className="text-muted-foreground mt-2">আপনার দোকানের হিসাব রাখুন সহজে</p>
        </div>

        <div className="card-elevated p-6 animate-fade-in">
          <div className="flex gap-2 mb-6">
            <button onClick={() => setMode('login')} className={`flex-1 py-3 rounded-xl font-medium transition-all ${isLogin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>লগইন</button>
            <button onClick={() => setMode('signup')} className={`flex-1 py-3 rounded-xl font-medium transition-all ${!isLogin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>নিবন্ধন</button>
          </div>

          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-2"><User className="w-4 h-4 inline mr-1" />আপনার নাম</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="পুরো নাম" className="input-field" autoComplete="name" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2"><Phone className="w-4 h-4 inline mr-1" />ফোন নম্বর</label>
              <PhoneInput value={phone} onChange={setPhone} selectedCountry={selectedCountry} onCountryChange={setSelectedCountry} placeholder="1XXXXXXXXX" autoFocus={isLogin} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2"><Lock className="w-4 h-4 inline mr-1" />পাসওয়ার্ড</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={isLogin ? '••••••••' : 'কমপক্ষে ৮ অক্ষর, ১টি সংখ্যা'}
                  className="input-field pl-10 pr-10" autoComplete={isLogin ? 'current-password' : 'new-password'} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {!isLogin && <div className="mt-2"><PasswordStrength password={password} /></div>}
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-2"><Lock className="w-4 h-4 inline mr-1" />পাসওয়ার্ড নিশ্চিত করুন</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="আবার পাসওয়ার্ড দিন" className="input-field pl-10" autoComplete="new-password" />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive mt-1">পাসওয়ার্ড মিলছে না</p>
                )}
              </div>
            )}

            {isLogin && (
              <button onClick={() => setMode('recovery')} className="text-sm text-primary hover:underline w-full text-right">
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            )}

            <Button onClick={isLogin ? handleLogin : handleSignup} disabled={loading} className="w-full btn-primary py-6 text-lg rounded-xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {isLogin ? 'লগইন করুন' : 'অ্যাকাউন্ট তৈরি করুন'}
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? (
              <>অ্যাকাউন্ট নেই?{' '}<button onClick={() => setMode('signup')} className="text-primary hover:underline font-medium">নিবন্ধন করুন</button></>
            ) : (
              <>অ্যাকাউন্ট আছে?{' '}<button onClick={() => setMode('login')} className="text-primary hover:underline font-medium">লগইন করুন</button></>
            )}
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">১৪ দিন ফ্রি ট্রায়াল সহ শুরু করুন</p>
      </div>
    </div>
  );
}
