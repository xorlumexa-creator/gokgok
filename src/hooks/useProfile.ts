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

type ProfileListener = (profile: AppProfile | null, loading: boolean) => void;

const PROFILE_CACHE_KEY = 'cache:profile';

function readPersistedProfile(): AppProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AppProfile) : null;
  } catch { return null; }
}

let cachedUserId: string | null = null;
let cachedProfile: AppProfile | null = readPersistedProfile();
let cachedLoading = false;
let inFlight: Promise<AppProfile | null> | null = null;
let listeners: ProfileListener[] = [];

function notifyProfileListeners() {
  listeners.forEach(listener => listener(cachedProfile, cachedLoading));
}

async function loadProfile(userId: string, force = false): Promise<AppProfile | null> {
  if (!force && cachedUserId === userId && cachedProfile) return cachedProfile;
  if (!force && cachedUserId === userId && inFlight) return inFlight;

  cachedUserId = userId;
  // Only show loading when we have NOTHING to render. If we already have a
  // cached profile (from a previous session), revalidate silently in the
  // background — no spinner, no perceived lag.
  cachedLoading = !cachedProfile;
  notifyProfileListeners();

  inFlight = Promise.resolve(
    supabase
      .from('profiles')
      .select('id,user_id,full_name,shop_name,phone,role,plan,plan_expiry,subscription_status,trial_start_date,temporary_access,temporary_expiry,must_change_password')
      .eq('user_id', userId)
      .maybeSingle()
  )
    .then(({ data }) => {
      cachedProfile = (data as AppProfile | null) ?? null;
      try {
        if (cachedProfile) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cachedProfile));
        else localStorage.removeItem(PROFILE_CACHE_KEY);
      } catch { /* ignore */ }
      return cachedProfile;
    })
    .finally(() => {
      cachedLoading = false;
      inFlight = null;
      notifyProfileListeners();
    });

  return inFlight;
}

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<AppProfile | null>(cachedProfile);
  const [loading, setLoading] = useState(cachedLoading || authLoading);

  const refresh = async (force = true) => {
    if (!user) {
      cachedUserId = null;
      cachedProfile = null;
      cachedLoading = false;
      try { localStorage.removeItem(PROFILE_CACHE_KEY); } catch { /* ignore */ }
      setProfile(null);
      setLoading(false);
      return null;
    }
    const data = await loadProfile(user.id, force);
    setProfile(data);
    setLoading(false);
    return data;
  };

  useEffect(() => {
    const listener: ProfileListener = (nextProfile, nextLoading) => {
      setProfile(nextProfile);
      setLoading(nextLoading || authLoading);
    };
    listeners.push(listener);

    if (authLoading) {
      setLoading(true);
    } else if (!user) {
      cachedUserId = null;
      cachedProfile = null;
      cachedLoading = false;
      setProfile(null);
      setLoading(false);
    } else {
      loadProfile(user.id).then(setProfile).finally(() => setLoading(false));
    }

    return () => { listeners = listeners.filter(item => item !== listener); };
  }, [user?.id, authLoading]);

  return { profile, loading: loading || authLoading, refresh };
}
