import { useState } from 'react';
import { ArrowLeft, Lock, Eye, EyeOff, Loader2, Phone, AlertTriangle, CheckCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { FaceScan } from '@/components/auth/FaceScan';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { countries, Country, defaultCountry } from '@/data/countries';

interface Props {
  onBack: () => void;
}

type Step = 'phone' | 'limit-check' | 'face-scan' | 'otp-send' | 'otp-verify' | 'reset' | 'success';

export function RecoveryFlow({ onBack }: Props) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  const [loading, setLoading] = useState(false);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [userId, setUserId] = useState('');
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [fineAdded, setFineAdded] = useState(false);
  const [method, setMethod] = useState<'face' | 'otp'>('face');

  const getFullPhone = () => {
    const clean = phone.startsWith('0') ? phone.slice(1) : phone;
    return `${selectedCountry.dialCode}${clean}`;
  };

  const currentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const handleCheckPhone = async () => {
    if (!phone.trim() || phone.length < 8) {
      toast({ title: "সঠিক ফোন নম্বর দিন", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const fullPhone = getFullPhone();
      
      // Look up user by phone
      const { data: userData, error: userError } = await supabase.rpc('find_user_for_recovery', { p_phone: fullPhone });
      if (userError) throw userError;
      if (!userData || userData.length === 0) {
        toast({ title: "এই ফোন নম্বর দিয়ে কোন অ্যাকাউন্ট পাওয়া যায়নি", variant: "destructive" });
        setLoading(false);
        return;
      }

      const user = userData[0];
      setUserId(user.p_user_id);
      setFaceDescriptor(user.p_face_descriptor as number[] | null);
      setFullName(user.p_full_name || '');

      // Check monthly count
      const { data: count, error: countError } = await supabase.rpc('get_monthly_recovery_count', {
        p_phone: fullPhone,
        p_month: currentMonth()
      });
      if (countError) throw countError;
      setMonthlyCount(count || 0);
      setStep('limit-check');
    } catch (e: any) {
      toast({ title: e.message || "সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToRecovery = () => {
    if (faceDescriptor && faceDescriptor.length > 0) {
      setMethod('face');
      setStep('face-scan');
    } else {
      setMethod('otp');
      setStep('otp-send');
    }
  };

  const handleFaceMatch = async () => {
    // Face matched - get reset token from edge function
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('password-recovery', {
        body: { action: 'verify-face', phone: getFullPhone(), month: currentMonth() }
      });
      if (error) throw error;
      if (data.resetToken) {
        setResetToken(data.resetToken);
        setFineAdded(data.fineAdded || false);
        setMonthlyCount(data.newCount || monthlyCount + 1);
        setStep('reset');
      }
    } catch (e: any) {
      toast({ title: "সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFaceFail = () => {
    setMethod('otp');
    setStep('otp-send');
  };

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('password-recovery', {
        body: { action: 'send-otp', phone: getFullPhone() }
      });
      if (error) throw error;
      if (data.success) {
        toast({ title: "OTP পাঠানো হয়েছে ✓" });
        setStep('otp-verify');
      } else {
        toast({ title: data.message || "OTP পাঠাতে সমস্যা", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "OTP পাঠাতে সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({ title: "৬ সংখ্যার OTP দিন", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('password-recovery', {
        body: { action: 'verify-otp', phone: getFullPhone(), otp, month: currentMonth() }
      });
      if (error) throw error;
      if (data.resetToken) {
        setResetToken(data.resetToken);
        setFineAdded(data.fineAdded || false);
        setMonthlyCount(data.newCount || monthlyCount + 1);
        setStep('reset');
      } else {
        toast({ title: data.message || "ভুল OTP", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "OTP যাচাই করতে সমস্যা", variant: "destructive" });
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
      toast({ title: "পাসওয়ার্ড মিলছে না", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('password-recovery', {
        body: { action: 'reset-password', resetToken, newPassword }
      });
      if (error) throw error;
      if (data.success) {
        setStep('success');
      } else {
        toast({ title: data.message || "পাসওয়ার্ড রিসেট করতে সমস্যা", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Step: Phone input
  if (step === 'phone') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="card-elevated p-6 animate-fade-in">
            <div className="text-center mb-6">
              <Phone className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold text-foreground">🔐 পাসওয়ার্ড রিকভারি</h2>
              <p className="text-sm text-muted-foreground mt-1">আপনার রেজিস্টার্ড ফোন নম্বর দিন</p>
            </div>
            <div className="space-y-4">
              <PhoneInput value={phone} onChange={setPhone} selectedCountry={selectedCountry} onCountryChange={setSelectedCountry} placeholder="1XXXXXXXXX" autoFocus />
              <Button onClick={handleCheckPhone} disabled={loading} className="w-full py-5 rounded-xl">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                পরবর্তী →
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

  // Step: Monthly limit check
  if (step === 'limit-check') {
    const freeLeft = Math.max(0, 3 - monthlyCount);
    const needsFine = monthlyCount >= 3;
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="card-elevated p-6 animate-fade-in text-center">
            {!needsFine ? (
              <>
                <Lock className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-bold text-foreground">🔐 পাসওয়ার্ড রিকভারি</h2>
                {fullName && <p className="text-muted-foreground mt-1">স্বাগতম, {fullName}</p>}
                <div className="bg-accent border border-border rounded-xl p-4 my-4">
                  <p className="text-sm text-muted-foreground">
                    এই মাসে বিনামূল্যে রিকভারি: <span className="font-bold text-foreground">{monthlyCount}/3</span> ব্যবহার হয়েছে
                  </p>
                  <p className="text-emerald-600 font-medium mt-1">
                    এখনও {freeLeft} টি বিনামূল্যে বাকি ✅
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-foreground">🚨 ফ্রি সীমা শেষ!</h2>
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 my-4">
                  <p className="text-sm text-muted-foreground">
                    এই মাসে ৩টি বিনামূল্যে রিকভারি শেষ হয়ে গেছে!
                  </p>
                  <p className="text-destructive font-bold text-lg mt-2">
                    পরবর্তী রিকভারির জন্য ২০ টাকা জরিমানা প্রযোজ্য!
                  </p>
                </div>
              </>
            )}
            <div className="space-y-3 mt-4">
              {!needsFine ? (
                <Button onClick={handleProceedToRecovery} className="w-full py-5 rounded-xl">
                  {faceDescriptor ? '🔍 মুখ স্ক্যান করে রিকভার করুন' : '📱 SMS OTP দিয়ে রিকভার করুন'}
                </Button>
              ) : (
                <>
                  <Button onClick={handleProceedToRecovery} className="w-full py-5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    ২০ টাকা দিয়ে রিকভার করুন
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={onBack} className="w-full py-4 rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-2" /> ফিরে যান
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step: Face scan
  if (step === 'face-scan') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="card-elevated p-6 animate-fade-in">
            <FaceScan
              storedDescriptor={faceDescriptor!}
              onMatch={handleFaceMatch}
              onFail={handleFaceFail}
              maxAttempts={3}
            />
            {loading && (
              <div className="text-center mt-4">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground mt-1">যাচাই করা হচ্ছে...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step: OTP send
  if (step === 'otp-send') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="card-elevated p-6 animate-fade-in text-center">
            <MessageSquare className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground">😓 {faceDescriptor ? 'মুখ স্ক্যান ব্যর্থ!' : 'SMS OTP রিকভারি'}</h2>
            <p className="text-muted-foreground mt-2">SMS OTP দিয়ে রিকভার করুন।</p>
            {faceDescriptor && (
              <p className="text-xs text-muted-foreground mt-1">এটি আপনার রিকভারি কাউন্টে যোগ হবে।</p>
            )}
            <div className="space-y-3 mt-6">
              <Button onClick={handleSendOtp} disabled={loading} className="w-full py-5 rounded-xl">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                📱 SMS OTP নিন
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

  // Step: OTP verify
  if (step === 'otp-verify') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="card-elevated p-6 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground">📱 OTP পাঠানো হয়েছে</h2>
              <p className="text-sm text-muted-foreground mt-1">আপনার ফোনে ৬ সংখ্যার কোড পাঠানো হয়েছে।</p>
            </div>
            <div className="flex justify-center mb-4">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <p className="text-xs text-center text-muted-foreground mb-4">কোডটি ১০ মিনিটের জন্য বৈধ।</p>
            <div className="space-y-3">
              <Button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6} className="w-full py-5 rounded-xl">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                নিশ্চিত করুন
              </Button>
              <button onClick={handleSendOtp} disabled={loading} className="text-sm text-primary hover:underline w-full text-center">
                OTP পাননি? নতুন OTP নিন
              </button>
              <p className="text-xs text-center text-muted-foreground">(নতুন OTP = রিকভারি কাউন্ট +১)</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step: Password reset
  if (step === 'reset') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="card-elevated p-6 animate-fade-in">
            <div className="text-center mb-6">
              <Lock className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-xl font-bold text-foreground">নতুন পাসওয়ার্ড দিন</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">নতুন পাসওয়ার্ড</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    placeholder="কমপক্ষে ৮ অক্ষর" className="input-field pl-10 pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="mt-2">
                  <PasswordStrength password={newPassword} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">পাসওয়ার্ড নিশ্চিত করুন</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="আবার পাসওয়ার্ড দিন" className="input-field pl-10" />
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive mt-1">পাসওয়ার্ড মিলছে না</p>
                )}
              </div>
              <Button onClick={handleResetPassword} disabled={loading} className="w-full py-5 rounded-xl">
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                পাসওয়ার্ড পরিবর্তন করুন
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step: Success
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="card-elevated p-6 animate-fade-in text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground">✅ পাসওয়ার্ড পরিবর্তন হয়েছে</h2>
            <div className="bg-accent border border-border rounded-xl p-4 my-4">
              <p className="text-sm text-muted-foreground">এই মাসে রিকভারি: {monthlyCount}/3</p>
              {fineAdded && (
                <p className="text-destructive font-medium mt-2">২০ টাকা জরিমানা যোগ হয়েছে 😅</p>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">পাসওয়ার্ড লিখে রাখুন! আর ভুলবেন না! 😄</p>
            <Button onClick={onBack} className="w-full py-5 rounded-xl">
              লগইন করুন →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
