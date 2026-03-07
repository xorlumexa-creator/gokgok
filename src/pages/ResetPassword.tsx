import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import logoImg from '@/assets/logo.png';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "পাসওয়ার্ড মিলেনি! আবার দিন", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess(true);
      toast({ title: "পাসওয়ার্ড পরিবর্তন হয়েছে ✅" });
    } catch (error: any) {
      toast({ title: error.message || "সমস্যা হয়েছে", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md card-elevated p-6 animate-fade-in text-center">
          <CheckCircle className="w-16 h-16 text-profit mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-3">✅ পাসওয়ার্ড পরিবর্তন হয়েছে</h2>
          <p className="text-muted-foreground mb-4">নতুন পাসওয়ার্ড সেট হয়েছে।</p>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-4">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">⚠️ মনে রাখবেন: পাসওয়ার্ড নিরাপদ জায়গায় লিখে রাখুন। ভুলে গেলে আবার ১০ টাকা ফি দিতে হবে! 😄</p>
          </div>
          <Button onClick={() => navigate('/auth')} className="w-full py-5 rounded-xl">
            লগইন করুন →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoImg} alt="ShopMate" className="w-16 h-16 rounded-2xl mx-auto mb-3 shadow-soft object-cover" />
          <h2 className="text-2xl font-bold text-foreground">নতুন পাসওয়ার্ড দিন</h2>
        </div>
        <div className="card-elevated p-6 animate-fade-in space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">নতুন পাসওয়ার্ড</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="input-field pl-10 pr-10" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">পাসওয়ার্ড নিশ্চিত করুন</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="input-field pl-10" />
            </div>
          </div>
          <Button onClick={handleReset} disabled={loading} className="w-full py-6 text-lg rounded-xl">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            পাসওয়ার্ড পরিবর্তন করুন
          </Button>
        </div>
      </div>
    </div>
  );
}
