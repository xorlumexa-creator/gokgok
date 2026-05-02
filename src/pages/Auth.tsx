import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, User, Phone, Mail, Store, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { countries, Country, defaultCountry } from '@/data/countries';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import logoImg from '@/assets/logo.png';

type Mode = 'login' | 'signup' | 'forgot';

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');

  // Shared
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Signup-only
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);

  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_evt, session) => setUser(session?.user ?? null)
    );
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    // Defer to allow profile trigger to populate
    const t = window.setTimeout(() => navigate('/dashboard'), 50);
    return () => window.clearTimeout(t);
  }, [user, navigate]);

  const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!validEmail(cleanEmail)) { toast({ title: 'সঠিক ইমেইল দিন', variant: 'destructive' }); return; }
    if (password.length < 6) { toast({ title: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) {
        toast({ title: 'ইমেইল বা পাসওয়ার্ড ভুল', variant: 'destructive' });
        return;
      }
      toast({ title: 'সফলভাবে লগইন হয়েছে ✓' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!name.trim()) { toast({ title: 'আপনার নাম দিন', variant: 'destructive' }); return; }
    if (!shopName.trim()) { toast({ title: 'দোকানের নাম দিন', variant: 'destructive' }); return; }
    if (!phone.trim() || phone.length < 8) { toast({ title: 'সঠিক ফোন নম্বর দিন', variant: 'destructive' }); return; }
    if (!validEmail(cleanEmail)) { toast({ title: 'সঠিক ইমেইল দিন', variant: 'destructive' }); return; }
    if (password.length < 6) { toast({ title: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে', variant: 'destructive' }); return; }
    if (password !== confirmPassword) { toast({ title: 'পাসওয়ার্ড মিলছে না', variant: 'destructive' }); return; }

    setLoading(true);
    try {
      const cleanPhone = phone.startsWith('0') ? phone.slice(1) : phone;
      const fullPhone = `${selectedCountry.dialCode}${cleanPhone}`;
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: name.trim(),
            shop_name: shopName.trim(),
            phone: fullPhone,
            country: selectedCountry.code,
          },
        },
      });
      if (error) {
        if (error.message.toLowerCase().includes('already')) {
          toast({ title: 'এই ইমেইল দিয়ে আগেই একাউন্ট আছে', variant: 'destructive' });
        } else {
          toast({ title: error.message, variant: 'destructive' });
        }
        return;
      }
      // With auto_confirm_email = true, session is returned immediately
      if (data.session) {
        toast({ title: 'একাউন্ট তৈরি হয়েছে ✓' });
      } else {
        // Fallback: explicit sign-in
        await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        toast({ title: 'একাউন্ট তৈরি হয়েছে ✓' });
      }
    } catch (e: any) {
      toast({ title: e.message || 'একাউন্ট তৈরি করতে সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!validEmail(cleanEmail)) { toast({ title: 'সঠিক ইমেইল দিন', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: 'রিসেট লিংক ইমেইলে পাঠানো হয়েছে ✓', description: 'ইনবক্স/স্প্যাম দেখুন।' });
      setMode('login');
    } catch (e: any) {
      toast({ title: e.message || 'সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const Logo = (
    <div className="text-center mb-6">
      <img src={logoImg} alt="Dukan 360°" className="w-20 h-20 rounded-2xl mx-auto mb-3 shadow-soft object-cover" />
      <h1 className="text-2xl font-bold text-foreground">Dukan 360°</h1>
      <p className="text-sm text-muted-foreground mt-1">আপনার দোকান, আপনার নিয়ন্ত্রণ</p>
    </div>
  );

  // Forgot password screen
  if (mode === 'forgot') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          {Logo}
          <div className="card-elevated p-6 animate-fade-in space-y-4">
            <div className="text-center">
              <Mail className="w-10 h-10 text-primary mx-auto mb-2" />
              <h2 className="text-lg font-bold">পাসওয়ার্ড রিসেট</h2>
              <p className="text-sm text-muted-foreground mt-1">আপনার ইমেইলে রিসেট লিংক পাঠানো হবে</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2"><Mail className="w-4 h-4 inline mr-1" />ইমেইল</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="input-field" autoFocus />
            </div>
            <Button onClick={handleForgot} disabled={loading} className="w-full py-5 rounded-xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              রিসেট লিংক পাঠান
            </Button>
            <Button variant="outline" onClick={() => setMode('login')} className="w-full py-4 rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" /> লগইনে ফিরে যান
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isLogin = mode === 'login';

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {Logo}

        <div className="card-elevated p-6 animate-fade-in">
          <div className="flex gap-2 mb-6">
            <button onClick={() => setMode('login')} className={`flex-1 py-3 rounded-xl font-medium transition-all ${isLogin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>লগইন</button>
            <button onClick={() => setMode('signup')} className={`flex-1 py-3 rounded-xl font-medium transition-all ${!isLogin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>নিবন্ধন</button>
          </div>

          <div className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2"><User className="w-4 h-4 inline mr-1" />নাম</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="পুরো নাম" className="input-field" autoComplete="name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2"><Store className="w-4 h-4 inline mr-1" />দোকানের নাম</label>
                  <input type="text" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="যেমন: করিম স্টোর" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2"><Phone className="w-4 h-4 inline mr-1" />মোবাইল নাম্বার</label>
                  <PhoneInput value={phone} onChange={setPhone} selectedCountry={selectedCountry} onCountryChange={setSelectedCountry} placeholder="1XXXXXXXXX" />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-2"><Mail className="w-4 h-4 inline mr-1" />ইমেইল ঠিকানা</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="input-field" autoComplete="email" autoFocus={isLogin} />
              {!isLogin && (
                <div className="mt-2 flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 text-yellow-700 dark:text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-800 dark:text-yellow-300">এই ইমেইলে পাসওয়ার্ড রিসেট লিংক যাবে। সঠিক ইমেইল দিন।</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2"><Lock className="w-4 h-4 inline mr-1" />পাসওয়ার্ড</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isLogin ? '••••••••' : 'কমপক্ষে ৬ অক্ষর'}
                  className="input-field pl-10 pr-10"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-2"><Lock className="w-4 h-4 inline mr-1" />পাসওয়ার্ড নিশ্চিত করুন</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="আবার পাসওয়ার্ড দিন" className="input-field pl-10" autoComplete="new-password" />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive mt-1">পাসওয়ার্ড মিলছে না</p>
                )}
              </div>
            )}

            {isLogin && (
              <button onClick={() => setMode('forgot')} className="text-sm text-primary hover:underline w-full text-right">
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            )}

            <Button onClick={isLogin ? handleLogin : handleSignup} disabled={loading} className="w-full py-6 text-lg rounded-xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {isLogin ? 'লগইন করুন' : 'একাউন্ট তৈরি করুন'}
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? (
              <>একাউন্ট নেই? <button onClick={() => setMode('signup')} className="text-primary hover:underline font-medium">নিবন্ধন করুন</button></>
            ) : (
              <>একাউন্ট আছে? <button onClick={() => setMode('login')} className="text-primary hover:underline font-medium">লগইন করুন</button></>
            )}
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">১৪ দিন ফ্রি ট্রায়াল সহ শুরু করুন</p>
      </div>
    </div>
  );
}
