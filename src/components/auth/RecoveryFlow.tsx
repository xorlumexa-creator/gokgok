// Legacy export kept for backward-compat. Real flow lives inside Auth.tsx ("forgot" mode).
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import logoImg from '@/assets/logo.png';

interface Props { onBack: () => void }

export function RecoveryFlow({ onBack }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      toast({ title: 'সঠিক ইমেইল দিন', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: 'রিসেট লিংক ইমেইলে পাঠানো হয়েছে ✓' });
      onBack();
    } catch (err: any) {
      toast({ title: err.message || 'সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src={logoImg} alt="Dukan 360°" className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover" />
        </div>
        <div className="card-elevated p-6 space-y-4">
          <div className="text-center">
            <Mail className="w-10 h-10 text-primary mx-auto mb-2" />
            <h2 className="text-lg font-bold">পাসওয়ার্ড রিসেট</h2>
          </div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="input-field" autoFocus />
          <Button onClick={send} disabled={loading} className="w-full py-5 rounded-xl">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            রিসেট লিংক পাঠান
          </Button>
          <Button variant="outline" onClick={onBack} className="w-full py-4 rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" /> ফিরে যান
          </Button>
        </div>
      </div>
    </div>
  );
}
