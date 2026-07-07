import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import logoImg from '@/assets/logo.png';
import { withTimeout } from '@/lib/asyncTimeout';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isManager, setIsManager] = useState(false);

  // Block managers from changing their password through the app.
  // Manager password is fixed and may only be changed via the Lovable editor.
  useEffect(() => {
    if (!user) return;
    withTimeout(supabase.from('profiles').select('role').eq('user_id', user.id).maybeSingle(), 5000, 'changePassword.role').then(({ data }) => {
      if (data?.role === 'manager') setIsManager(true);
    }).catch((e) => console.warn('[change-password] role lookup failed:', e));
  }, [user?.id]);

  const submit = async () => {
    if (isManager) {
      toast({ title: 'ম্যানেজার পাসওয়ার্ড অ্যাপ থেকে পরিবর্তন করা যাবে না', description: 'শুধু Lovable Editor থেকে পরিবর্তন সম্ভব', variant: 'destructive' });
      return;
    }
    if (pw.length < 6) { toast({ title: 'কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন', variant: 'destructive' }); return; }
    if (pw !== confirm) { toast({ title: 'পাসওয়ার্ড মিলছে না', variant: 'destructive' }); return; }
    if (!user) { navigate('/auth'); return; }
    setLoading(true);
    try {
      const { error } = await withTimeout(supabase.auth.updateUser({ password: pw }), 5000, 'changePassword.updateUser');
      if (error) throw error;
      await withTimeout(supabase.from('profiles').update({ must_change_password: false }).eq('user_id', user.id), 5000, 'changePassword.profile');
      toast({ title: 'পাসওয়ার্ড পরিবর্তন হয়েছে ✓' });
      navigate('/dashboard');
    } catch (e: any) {
      toast({ title: e.message || 'সমস্যা হয়েছে', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src={logoImg} alt="Dukan 360°" className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover" />
          <h2 className="text-xl font-bold">নতুন পাসওয়ার্ড সেট করুন</h2>
          <p className="text-sm text-muted-foreground">অস্থায়ী পাসওয়ার্ড পরিবর্তন বাধ্যতামূলক</p>
        </div>
        <div className="card-elevated p-6 animate-fade-in space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">নতুন পাসওয়ার্ড</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} className="input-field pl-10 pr-10" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">নিশ্চিত করুন</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} className="input-field pl-10" />
            </div>
          </div>
          <Button onClick={submit} disabled={loading} className="w-full py-5 rounded-xl">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
            পাসওয়ার্ড সেভ করুন
          </Button>
        </div>
      </div>
    </div>
  );
}
