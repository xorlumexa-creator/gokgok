import { useState } from 'react';
import { ArrowLeft, Loader2, Mail, Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import logoImg from '@/assets/logo.png';

interface Props {
  onBack: () => void;
}

type Step = 'email' | 'otp' | 'new-password' | 'success';

export function RecoveryFlow({ onBack }: Props) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryCount, setRecoveryCount] = useState(0);
  const [wasFree, setWasFree] = useState(true);
  const [fineAmount, setFineAmount] = useState(0);
  const [totalFines, setTotalFines] = useState(0);
  const [finesUnpaid, setFinesUnpaid] = useState(0);
  const [authEmail, setAuthEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');

  // Check recovery count before sending OTP
  const handleCheckAndSendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast({ title: "সঠিক ইমেইল দিন", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Check profile for recovery count
      const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_recovery_count, recovery_month, total_fines, fines_unpaid')
        .eq('email', cleanEmail)
        .single();

      if (!profile) {
        toast({ title: "এই ইমেইলে কোনো একাউন্ট নেই", variant: "destructive" });
        setLoading(false);
        return;
      }

      const currentMonth = new Date().toISOString().slice(0, 7);
      let count = profile.monthly_recovery_count || 0;
      if (profile.recovery_month !== currentMonth) count = 0;

      setRecoveryCount(count);
      setTotalFines(profile.total_fines || 0);
      setFinesUnpaid(profile.fines_unpaid || 0);

      // If count >= 3, show warning but still allow (fine will be applied on verify)
      await sendOtp(cleanEmail);
    } catch (e: any) {
      toast({ title: e.message || "সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async (emailAddr: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp-email', {
        body: { email: emailAddr }
      });
      if (error) throw error;
      if (data?.error === 'rate_limit') {
        toast({ title: data.message || "১ ঘন্টা পর আবার চেষ্টা করুন", variant: "destructive" });
        return;
      }
      if (data?.error === 'not_found') {
        toast({ title: "এই ইমেইলে কোনো একাউন্ট নেই", variant: "destructive" });
        return;
      }
      if (data?.error) {
        toast({ title: data.message || data.error, variant: "destructive" });
        return;
      }
      if (data?.test_otp) {
        toast({ title: `টেস্ট মোড: আপনার OTP হলো ${data.test_otp}` });
      } else {
        toast({ title: "ইমেইলে OTP পাঠানো হয়েছে ✓" });
      }
      setStep('otp');
    } catch (e: any) {
      toast({ title: e.message || "OTP পাঠাতে সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast({ title: "৬ সংখ্যার কোড দিন", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { email: email.trim().toLowerCase(), otp, action: 'reset-password' }
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: data.message || data.error, variant: "destructive" });
        setLoading(false);
        return;
      }
      if (data?.success) {
        setAuthEmail(data.email);
        setTempPassword(data.tempPassword);
        setWasFree(data.wasFree);
        setFineAmount(data.fineAmount);
        setRecoveryCount(data.recoveryCount);
        setTotalFines(data.totalFines);
        setFinesUnpaid(data.finesUnpaid);

        // Auto-login with temp password
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.tempPassword
        });
        if (signInError) throw signInError;

        setStep('new-password');
      }
    } catch (e: any) {
      toast({ title: e.message || "সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে", variant: "destructive" });
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast({ title: "পাসওয়ার্ডে কমপক্ষে ১টি সংখ্যা থাকতে হবে", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "পাসওয়ার্ড মিলেনি!", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setStep('success');
    } catch (e: any) {
      toast({ title: e.message || "সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const freeLeft = Math.max(0, 3 - recoveryCount);

  // Step: Email input
  if (step === 'email') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="card-elevated p-6 animate-fade-in">
            <div className="text-center mb-6">
              <Mail className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold text-foreground">📧 পাসওয়ার্ড রিকভারি</h2>
              <p className="text-sm text-muted-foreground mt-1">আপনার রেজিস্টার্ড ইমেইল দিন</p>
            </div>

            {recoveryCount > 0 && (
              <div className="mb-4 p-3 bg-primary/5 rounded-xl text-center">
                <p className="text-sm text-foreground mb-1">এই মাসে বিনামূল্যে রিকভারি:</p>
                <div className="flex justify-center gap-2">
                  {[0, 1, 2].map(i => (
                    <span key={i} className={`text-lg ${i < recoveryCount ? 'opacity-30' : ''}`}>
                      {i < recoveryCount ? '⬜' : '✅'}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{freeLeft} টি বাকি</p>
              </div>
            )}

            {recoveryCount >= 3 && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                <p className="text-sm font-medium text-destructive">⚠️ ফ্রি সীমা শেষ!</p>
                <p className="text-xs text-muted-foreground mt-1">এই রিকভারির জন্য ৳৫ জরিমানা যোগ হবে।</p>
                {finesUnpaid > 0 && <p className="text-xs text-muted-foreground">এখন পর্যন্ত জরিমানা: ৳{finesUnpaid}</p>}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2"><Mail className="w-4 h-4 inline mr-1" />ইমেইল</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input-field"
                  autoFocus
                />
              </div>
              <Button onClick={handleCheckAndSendOtp} disabled={loading} className="w-full py-5 rounded-xl">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {recoveryCount >= 3 ? '৳৫ জরিমানা দিয়ে OTP পাঠান' : 'OTP পাঠান'}
              </Button>
              <Button variant="outline" onClick={onBack} className="w-full py-4 rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-2" /> ফিরে যান
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step: OTP input
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="card-elevated p-6 animate-fade-in">
            <div className="text-center mb-6">
              <Mail className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold text-foreground">📧 OTP পাঠানো হয়েছে!</h2>
              <p className="text-sm text-muted-foreground mt-1">আপনার ইমেইলে ৬ সংখ্যার কোড পাঠানো হয়েছে।</p>
            </div>
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="_ _ _ _ _ _"
                  className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-center mt-2">কোডটি ১০ মিনিটের জন্য বৈধ।</p>
              </div>

              <div className="bg-accent/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">
                  ইমেইল পাননি? স্প্যাম ফোল্ডার চেক করুন।
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => sendOtp(email.trim().toLowerCase())} disabled={loading} className="flex-1 py-4 rounded-xl">
                  নতুন OTP নিন
                </Button>
                <Button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6} className="flex-1 py-4 rounded-xl">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  নিশ্চিত করুন
                </Button>
              </div>

              <Button variant="outline" onClick={() => setStep('email')} className="w-full py-3 rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-2" /> ফিরে যান
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step: New password
  if (step === 'new-password') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="card-elevated p-6 animate-fade-in space-y-4">
            <div className="text-center">
              <Lock className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold text-foreground">নতুন পাসওয়ার্ড দিন</h2>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">নতুন পাসওয়ার্ড</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="কমপক্ষে ৮ অক্ষর, ১টি সংখ্যা"
                  className="input-field pl-10 pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="mt-2"><PasswordStrength password={newPassword} /></div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">পাসওয়ার্ড নিশ্চিত করুন</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="আবার পাসওয়ার্ড দিন"
                  className="input-field pl-10"
                />
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive mt-1">পাসওয়ার্ড মিলছে না</p>
              )}
            </div>
            <div className="space-y-1 text-sm">
              <p className={newPassword.length >= 8 ? 'text-profit' : 'text-muted-foreground'}>
                {newPassword.length >= 8 ? '✅' : '⬜'} কমপক্ষে ৮ অক্ষর
              </p>
              <p className={/[0-9]/.test(newPassword) ? 'text-profit' : 'text-muted-foreground'}>
                {/[0-9]/.test(newPassword) ? '✅' : '⬜'} কমপক্ষে ১টি সংখ্যা
              </p>
            </div>
            <Button onClick={handleResetPassword} disabled={loading} className="w-full py-6 text-lg rounded-xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              পাসওয়ার্ড পরিবর্তন করুন
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step: Success
  return (
    <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md card-elevated p-6 animate-fade-in text-center">
        <CheckCircle className="w-16 h-16 text-profit mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-3">✅ পাসওয়ার্ড পরিবর্তন হয়েছে!</h2>

        {wasFree ? (
          <p className="text-muted-foreground mb-3">এই মাসে রিকভারি: {recoveryCount}/3</p>
        ) : (
          <div className="space-y-2 mb-3">
            <p className="text-destructive font-medium">৳{fineAmount} জরিমানা যোগ হয়েছে 😅</p>
            <p className="text-sm text-muted-foreground">মোট বকেয়া জরিমানা: ৳{finesUnpaid}</p>
          </div>
        )}

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            পাসওয়ার্ড লিখে রাখুন! আর ভুলবেন না! 😄
          </p>
        </div>

        <Button onClick={onBack} className="w-full py-5 rounded-xl">
          লগইন করুন →
        </Button>
      </div>
    </div>
  );
}
