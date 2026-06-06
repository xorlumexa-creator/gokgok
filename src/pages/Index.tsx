import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/context/StoreContext';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [mounted, setMounted] = useState(false);
  const { user, loading } = useAuth();
  const { isOnboarded, completeOnboarding } = useStore();
  const navigate = useNavigate();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || loading) return;
    if (!user) { navigate('/auth', { replace: true }); return; }

    // Auto-onboard silently: never show shop-name prompt.
    if (isOnboarded) { navigate('/dashboard', { replace: true }); return; }

    (async () => {
      let name = 'আমার দোকান';
      try {
        const { data } = await supabase
          .from('profiles')
          .select('shop_name')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data?.shop_name?.trim()) name = data.shop_name.trim();
      } catch (e) { console.warn('profile lookup failed', e); }
      completeOnboarding(name, []);
      navigate('/dashboard', { replace: true });
    })();
  }, [mounted, loading, user, isOnboarded, navigate, completeOnboarding]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
};

export default Index;
