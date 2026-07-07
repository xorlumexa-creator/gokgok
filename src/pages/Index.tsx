import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/context/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { LoadingEscape } from '@/components/StartupFailsafe';
import { withTimeout } from '@/lib/asyncTimeout';

const Index = () => {
  // Removed `mounted` state — it added an extra render cycle causing a spinner flash
  const { user, loading } = useAuth();
  const { isOnboarded, completeOnboarding } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for auth to resolve
    if (loading) return;

    // Not logged in → go to auth
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    // Already onboarded → go straight to dashboard (no spinner needed)
    if (isOnboarded) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // New user: silently fetch shop name and complete onboarding
    (async () => {
      let name = 'আমার দোকান';
      try {
        const { data } = await withTimeout(supabase
          .from('profiles')
          .select('shop_name')
          .eq('user_id', user.id)
          .maybeSingle(), 5000, 'setup.profile');
        if (data?.shop_name?.trim()) name = data.shop_name.trim();
      } catch (e) {
        console.warn('profile lookup failed', e);
      }
      completeOnboarding(name, []);
      navigate('/dashboard', { replace: true });
    })();
  }, [loading, user, isOnboarded, navigate, completeOnboarding]);
  // Removed `mounted` from deps — no longer needed

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <LoadingEscape />
    </div>
  );
};

export default Index;
