import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AppProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  shop_name: string | null;
  phone: string | null;
  role: 'user' | 'manager';
  plan: string | null;
  plan_expiry: string | null;
  subscription_status: string;
  trial_start_date: string;
  temporary_access: boolean;
  temporary_expiry: string | null;
  must_change_password: boolean;
}

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    setProfile((data as any) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [user?.id, authLoading]);

  return { profile, loading: loading || authLoading, refresh };
}
