import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, User, Phone, Store, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { primeAuthSession, useAuth } from '@/hooks/useAuth';
import { primeProfileFromAuth } from '@/hooks/useProfile';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { Country, defaultCountry } from '@/data/countries';
import { normalizePhone, phoneToEmail, isManagerPhone } from '@/lib/phone';
import logoImg from '@/assets/logo.png';

type Mode = 'login' | 'signup';

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');

  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState<Country>(defaultCountry);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');

  const { user, loading: authLoading } = useAuth();

  // If a session is already restored when Auth page mounts, bounce away
  // immediately — no extra profiles query, no second navigate race.
  useEffect(() => {
    if (authLoading || !user) return;
    const phoneMeta = (user.user_metadata?.phone as string) || '';
    if (isManagerPhone(phoneMeta)) navigate('/manager', { replace: true });
    else navigate('/dashboard', { replace: true });
  }, [authLoading, user, navigate]);

  const handleLogin = async () => {
    const normalized = normalizePhone(phone, country.dialCode);
    if (!normalized || normalized.length < 8) {
      toast({ title: 'সঠিক ফোন নম্বর দিন', variant: 'destructive' }); return;
    }
    if (password.length < 6) {
      toast({ title: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে', variant: 'destructive' }); return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(normalized),
        password,
      });
      if (error) {
        toast({ title: 'ফোন বা পাসওয়ার্ড ভুল', variant: 'destructive' });
        return;
      }
      const normalizedForRoute = normalized;
      primeAuthSession(data.session ?? null);
      if (data.user) primeProfileFromAuth(data.user.id, { ...data.user.user_metadata, phone: normalized });
      if (isManagerPhone(normalizedForRoute)) navigate('/manager', { replace: true });
      else navigate('/dashboard', { replace: true });
      toast({ title: 'সফলভাবে লগইন হয়েছে ✓' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    const normalized = normalizePhone(phone, country.dialCode);
    if (!name.trim()) { toast({ title: 'আপনার নাম দিন', variant: 'destructive' }); return; }
    if (!shopName.trim()) { toast({ title: 'দোকানের নাম দিন', variant: 'destructive' }); return; }
    if (!normalized || normalized.length < 8) { toast({ title: 'সঠিক ফোন নম্বর দিন', variant: 'destructive' }); return; }
    if (password.length < 6) { toast({ title: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে', variant: 'destructive' }); return; }
    if (password !== confirmPassword) { toast({ title: 'পাসওয়ার্ড মিলছে না', variant: 'destructive' }); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: phoneToEmail(normalized),
        password,
        options: {
          data: {
            full_name: name.trim(),
            shop_name: shopName.trim(),
            phone: normalized,
            country: country.code,
          },
        },
      });
      if (error) {
        if (error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('registered')) {
          toast({ title: 'এই ফোন নম্বরে আগেই একাউন্ট আছে', variant: 'destructive' });
        } else {
          toast({ title: error.message, variant: 'destructive' });
        }
        return;
      }
      let session = data.session;
      let user = data.user;
      if (!session) {
        const signedIn = await supabase.auth.signInWithPassword({ email: phoneToEmail(normalized), password });
        session = signedIn.data.session;
        user = signedIn.data.user;
      }
      primeAuthSession(session ?? null);
      if (user) primeProfileFromAuth(user.id, { full_name: name.trim(), shop_name: shopName.trim(), phone: normalized });
      navigate(isManagerPhone(normalized) ? '/manager' : '/dashboard', { replace: true });
      if (isManagerPhone(normalized)) {
        toast({ title: 'ম্যানেজার একাউন্ট তৈরি হয়েছে ✓' });
      } else {
        toast({ title: 'একাউন্ট তৈরি হয়েছে ✓' });
      }
    } catch (e: any) {
      toast({ title: e.message || 'একাউন্ট তৈরি করতে সমস্যা হয়েছে', variant: 'destructive' });
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

  const isLogin = mode === 'login';

  return (
    <main className="auth-scroll-page bg-gradient-to-b from-accent via-background to-background px-4 py-6 sm:px-6 sm:py-10">
      <div className="w-full max-w-md mx-auto">
        {Logo}

        <div className="card-elevated p-5 sm:p-6">
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
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-2"><Phone className="w-4 h-4 inline mr-1" />মোবাইল নাম্বার</label>
              <PhoneInput value={phone} onChange={setPhone} selectedCountry={country} onCountryChange={setCountry} placeholder="1XXXXXXXXX" autoFocus={isLogin} />
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
              <button onClick={() => navigate('/forgot-password')} className="text-sm text-primary hover:underline w-full text-right">
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

        <button onClick={() => navigate('/')} className="mt-6 text-xs text-muted-foreground flex items-center justify-center w-full gap-1 hover:text-foreground">
          <ArrowLeft className="w-3 h-3" /> হোমে ফিরে যান
        </button>
      </div>
    </main>
  );
}
