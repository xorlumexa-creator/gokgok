import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
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
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Establish recovery session from the magic link before allowing password update.
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const url = new URL(window.location.href);
        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(hash);

        const code = url.searchParams.get('code');
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');
        const error_description =
          url.searchParams.get('error_description') || hashParams.get('error_description');

        if (error_description) {
          if (!cancelled) setAuthError(decodeURIComponent(error_description));
          return;
        }

        // 1) PKCE flow — ?code=xxx
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (!cancelled) setAuthError(error.message);
            return;
          }
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);
        }
        // 2) Implicit flow — #access_token=...&refresh_token=...
        else if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) {
            if (!cancelled) setAuthError(error.message);
            return;
          }
          window.history.replaceState({}, '', window.location.pathname);
        }

        // Verify a session now exists
        const { data: { session } } = await supabase.auth.getSession();
        if (!cancelled) {
          if (session) {
            setAuthReady(true);
          } else {
            setAuthError('রিসেট লিংক মেয়াদোত্তীর্ণ বা ভুল। আবার চেষ্টা করুন।');
          }
        }
      } catch (e: any) {
        if (!cancelled) setAuthError(e.message || 'সমস্যা হয়েছে');
      }
    };

    // Listen for PASSWORD_RECOVERY event as a fallback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setAuthReady(true);
        setAuthError(null);
      }
    });

    init();
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleReset = async () => {
    if (!authReady) {
      toast({ title: 'অপেক্ষা করুন, যাচাই হচ্ছে...', variant: 'destructive' });
      return;
    }
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
      // Sign out so user logs in fresh with the new password
      await supabase.auth.signOut();
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
          <p className="text-muted-foreground mb-4">নতুন পাসওয়ার্ড দিয়ে লগইন করুন।</p>
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
          <img src={logoImg} alt="Dukan 360°" className="w-16 h-16 rounded-2xl mx-auto mb-3 shadow-soft object-cover" />
          <h2 className="text-2xl font-bold text-foreground">নতুন পাসওয়ার্ড দিন</h2>
        </div>

        {authError ? (
          <div className="card-elevated p-6 animate-fade-in text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
            <h3 className="font-bold text-foreground">লিংক যাচাই করা যায়নি</h3>
            <p className="text-sm text-muted-foreground">{authError}</p>
            <Button onClick={() => navigate('/auth')} className="w-full py-5 rounded-xl">
              আবার চেষ্টা করুন
            </Button>
          </div>
        ) : !authReady ? (
          <div className="card-elevated p-6 animate-fade-in text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">যাচাই হচ্ছে...</p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
