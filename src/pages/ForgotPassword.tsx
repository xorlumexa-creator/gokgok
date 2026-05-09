import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Loader2, ArrowLeft, ShieldAlert, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PhoneInput } from '@/components/auth/PhoneInput';
import { Country, defaultCountry } from '@/data/countries';
import { normalizePhone } from '@/lib/phone';
import logoImg from '@/assets/logo.png';

function genTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'DK';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState<Country>(defaultCountry);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    const normalized = normalizePhone(phone, country.dialCode);
    if (!normalized || normalized.length < 8) {
      toast({ title: 'সঠিক ফোন নম্বর দিন', variant: 'destructive' }); return;
    }
    setLoading(true);
    try {
      // Look up profile by phone
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, shop_name')
        .eq('phone', normalized)
        .maybeSingle();

      if (!profile) {
        toast({ title: 'এই ফোন নম্বরে কোনো একাউন্ট পাওয়া যায়নি।', variant: 'destructive' });
        setLoading(false);
        return;
      }

      const tempPassword = genTempPassword();

      // Insert request (managers will see it in panel)
      const { error: insErr } = await supabase
        .from('password_reset_requests')
        .insert({
          user_id: profile.user_id,
          user_phone: normalized,
          temp_password: tempPassword,
          status: 'pending',
        });
      if (insErr) throw insErr;

      // Ask edge function to actually update the auth password (service role)
      await supabase.functions.invoke('reset-password-temp', {
        body: { user_id: profile.user_id, temp_password: tempPassword },
      });

      setSubmitted(true);
    } catch (e: any) {
      toast({ title: e.message || 'সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex items-center justify-center p-6">
        <div className="w-full max-w-md card-elevated p-6 animate-fade-in space-y-4 text-center">
          <CheckCircle className="w-14 h-14 text-profit mx-auto" />
          <h2 className="text-xl font-bold">রিকোয়েস্ট গ্রহণ করা হয়েছে</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            আপনার পাসওয়ার্ড রিসেট রিকোয়েস্ট গ্রহণ করা হয়েছে।
          </p>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-left flex gap-2">
            <ShieldAlert className="w-5 h-5 text-yellow-700 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800 dark:text-yellow-300 leading-relaxed">
              নিরাপত্তার কারণে পাসওয়ার্ড রিসেট করতে কিছু সময় লাগতে পারে।
              নতুন অস্থায়ী পাসওয়ার্ড আপনার WhatsApp নম্বরে পাঠানো হবে।
            </p>
          </div>
          <Button onClick={() => navigate('/auth')} className="w-full py-5 rounded-xl">
            লগইন পেজে ফিরে যান
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src={logoImg} alt="Dukan 360°" className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover" />
          <h2 className="text-xl font-bold">পাসওয়ার্ড রিসেট</h2>
          <p className="text-sm text-muted-foreground">আপনার ফোন নম্বর দিন</p>
        </div>
        <div className="card-elevated p-6 animate-fade-in space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2"><Phone className="w-4 h-4 inline mr-1" />ফোন নম্বর</label>
            <PhoneInput value={phone} onChange={setPhone} selectedCountry={country} onCountryChange={setCountry} placeholder="1XXXXXXXXX" autoFocus />
          </div>
          <Button onClick={submit} disabled={loading} className="w-full py-5 rounded-xl">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            রিসেট রিকোয়েস্ট পাঠান
          </Button>
          <Button variant="outline" onClick={() => navigate('/auth')} className="w-full py-4 rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" /> ফিরে যান
          </Button>
        </div>
      </div>
    </div>
  );
}
