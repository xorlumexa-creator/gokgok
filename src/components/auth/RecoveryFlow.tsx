import { useState } from 'react';
import { ArrowLeft, Loader2, Phone, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { FaceScan } from '@/components/auth/FaceScan';
import { countries, Country, defaultCountry } from '@/data/countries';

interface Props {
  onBack: () => void;
}

type Step = 'phone' | 'face-scan' | 'no-face';

export function RecoveryFlow({ onBack }: Props) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  const [loading, setLoading] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [fullName, setFullName] = useState('');

  const getFullPhone = () => {
    const clean = phone.startsWith('0') ? phone.slice(1) : phone;
    return `${selectedCountry.dialCode}${clean}`;
  };

  const handleCheckPhone = async () => {
    if (!phone.trim() || phone.length < 8) {
      toast({ title: "সঠিক ফোন নম্বর দিন", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const fullPhone = getFullPhone();
      const { data: userData, error: userError } = await supabase.rpc('find_user_for_recovery', { p_phone: fullPhone });
      if (userError) throw userError;
      if (!userData || userData.length === 0) {
        toast({ title: "এই ফোন নম্বর দিয়ে কোন অ্যাকাউন্ট পাওয়া যায়নি", variant: "destructive" });
        return;
      }

      const user = userData[0];
      setFaceDescriptor(user.p_face_descriptor as number[] | null);
      setFullName(user.p_full_name || '');

      if (user.p_face_descriptor && (user.p_face_descriptor as number[]).length > 0) {
        setStep('face-scan');
      } else {
        setStep('no-face');
      }
    } catch (e: any) {
      toast({ title: e.message || "সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFaceMatch = async () => {
    setLoading(true);
    try {
      const fullPhone = getFullPhone();
      // Call edge function to log recovery and get auto-login token
      const { data, error } = await supabase.functions.invoke('password-recovery', {
        body: { action: 'face-login', phone: fullPhone }
      });
      if (error) throw error;

      if (data?.email && data?.tempPassword) {
        // Auto-login with temporary credentials
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.tempPassword
        });
        
        if (signInError) {
          // Fallback: try signing in with a custom token approach
          toast({ title: "স্বয়ংক্রিয় লগইন ব্যর্থ। অনুগ্রহ করে আবার চেষ্টা করুন।", variant: "destructive" });
          return;
        }

        toast({ 
          title: "মুখ যাচাই সফল হয়েছে ✓", 
          description: "⚠️ অনুগ্রহ করে আপনার পাসওয়ার্ড পরিবর্তন করুন!" 
        });
        
        // Navigate to profile page - the auth state change will handle this
        // We set a flag in sessionStorage so the profile page can show the warning
        sessionStorage.setItem('password_change_warning', 'true');
        window.location.href = '/profile';
      } else {
        toast({ title: "সমস্যা হয়েছে", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleFaceFail = () => {
    toast({ title: "মুখ স্ক্যান ব্যর্থ হয়েছে। আবার চেষ্টা করুন।", variant: "destructive" });
    setStep('phone');
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

  // Step: No face registered
  if (step === 'no-face') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="card-elevated p-6 animate-fade-in text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground">মুখের ছবি নেই!</h2>
            {fullName && <p className="text-muted-foreground mt-1">{fullName}</p>}
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 my-4">
              <p className="text-sm text-muted-foreground">
                আপনার অ্যাকাউন্টে মুখের ছবি রেজিস্ট্রেশন করা হয়নি।
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                পাসওয়ার্ড রিকভার করতে মুখের ছবি প্রয়োজন।
              </p>
            </div>
            <Button variant="outline" onClick={onBack} className="w-full py-4 rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" /> ফিরে যান
            </Button>
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
            {fullName && (
              <p className="text-center text-muted-foreground mb-3">স্বাগতম, {fullName}</p>
            )}
            <FaceScan
              storedDescriptor={faceDescriptor!}
              onMatch={handleFaceMatch}
              onFail={handleFaceFail}
              maxAttempts={3}
            />
            {loading && (
              <div className="text-center mt-4">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground mt-1">লগইন করা হচ্ছে...</p>
              </div>
            )}
            <Button variant="outline" onClick={() => setStep('phone')} className="w-full py-4 rounded-xl mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> ফিরে যান
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
