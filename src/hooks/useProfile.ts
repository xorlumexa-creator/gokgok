import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { isManagerPhone } from '@/lib/phone';
import { withTimeout } from '@/lib/asyncTimeout';

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
  created_at?: string;
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
// FIX: cachedLoading starts false always — we have persisted data or we don't.
// Never start as true; let the effect decide if a fetch is needed.
let cachedLoading = false;
let inFlight: Promise<AppProfile | null> | null = null;
let listeners: ProfileListener[] = [];

function persistProfile(profile: AppProfile | null) {
  try {
    if (profile) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch { /* ignore */ }
}

export function primeProfileFromAuth(userId: string, metadata: Record<string, any> = {}) {
  const shopName = typeof metadata.shop_name === 'string' ? metadata.shop_name.trim() : '';
  const fullName = typeof metadata.full_name === 'string' ? metadata.full_name.trim() : '';
  const phone = typeof metadata.phone === 'string' ? metadata.phone : null;
  if (!shopName && cachedProfile?.user_id === userId) return cachedProfile;

  const previous = cachedProfile?.user_id === userId ? cachedProfile : null;

  cachedUserId = userId;
  const primed: AppProfile = {
    ...(previous ?? {} as AppProfile),
    id: previous?.id || userId,
    user_id: userId,
    full_name: fullName || previous?.full_name || null,
    shop_name: shopName || previous?.shop_name || null,
    phone,
    role: phone && isManagerPhone(phone) ? 'manager' : (previous?.role || 'user'),
    plan: previous?.plan || null,
    plan_expiry: previous?.plan_expiry || null,
    // IMPORTANT: never fabricate subscription_status/trial_start_date when
    // we have no previous cached data. Guessing 'trial' + today's date here
    // meant any paid user whose local cache was empty (e.g. after clearing
    // app data, or right after a password reset) would flash — and, if the
    // real fetch below then failed/timed out, permanently show — as being
    // on a brand-new trial. Leave these blank until the real DB fetch in
    // loadProfile() confirms the actual values.
    subscription_status: previous?.subscription_status || '',
    trial_start_date: previous?.trial_start_date || '',
    temporary_access: previous?.temporary_access || false,
    temporary_expiry: previous?.temporary_expiry || null,
    must_change_password: previous?.must_change_password || false,
  };

  cachedProfile = primed;
  cachedLoading = false;

  // Only persist to localStorage if this profile actually has confirmed
  // subscription data (i.e. it came from a previous real fetch, not a
  // fresh guess). A bare optimistic guess must never become "sticky"
  // ground truth in the cache.
  if (previous) persistProfile(cachedProfile);

  notifyProfileListeners();
  return cachedProfile;
}

function notifyProfileListeners() {
  listeners.forEach(listener => listener(cachedProfile, cachedLoading));
}

async function loadProfile(userId: string, force = false): Promise<AppProfile | null> {
  if (!force && cachedUserId === userId && cachedProfile) return cachedProfile;
  if (!force && cachedUserId === userId && inFlight) return inFlight;

  const hasProfileForUser = cachedProfile?.user_id === userId;
  if (!hasProfileForUser) cachedProfile = null;
  cachedUserId = userId;

  // FIX: Only show loading spinner when we have NOTHING cached for this user.
  // If we have a cached profile, revalidate silently — no spinner, no glitch.
  cachedLoading = !hasProfileForUser;
  notifyProfileListeners();

  inFlight = withTimeout(
    supabase
      .from('profiles')
      .select('id,user_id,full_name,shop_name,phone,role,plan,plan_expiry,subscription_status,trial_start_date,temporary_access,temporary_expiry,must_change_password,created_at')
      .eq('user_id', userId)
      .maybeSingle(),
    5000,
    'profile.load',
  )
    .then(({ data, error }) => {
      if (error) throw error;
      cachedProfile = (data as AppProfile | null) ?? null;
      persistProfile(cachedProfile);
      return cachedProfile;
    })
    .catch((error) => {
      console.warn('[profile] load failed:', error);
      return cachedProfile?.user_id === userId ? cachedProfile : null;
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
  // FIX: Don't include authLoading in initial loading state.
  // Auth loading is handled separately in ProtectedRoute.
  // Mixing them caused double-loading flicker.
  const [loading, setLoading] = useState(cachedLoading);

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
    try {
      const data = await loadProfile(user.id, force);
      setProfile(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const listener: ProfileListener = (nextProfile, nextLoading) => {
      setProfile(nextProfile);
      // FIX: Don't merge authLoading here — it causes extra re-renders
      setLoading(nextLoading);
    };
    listeners.push(listener);

    if (authLoading) {
      // Auth not ready yet — don't fetch profile, just wait
      setLoading(false); // FIX: Don't show spinner while auth loads; ProtectedRoute handles that
    } else if (!user) {
      // Logged out — clear everything
      cachedUserId = null;
      cachedProfile = null;
      cachedLoading = false;
      setProfile(null);
      setLoading(false);
    } else {
      // Logged in — load profile (silently if cached)
      if (cachedProfile?.user_id !== user.id) {
        setProfile(null);
        setLoading(true);
      }
      loadProfile(user.id).then(setProfile).catch(() => setProfile(cachedProfile)).finally(() => setLoading(false));
    }

    return () => { listeners = listeners.filter(item => item !== listener); };
  }, [user?.id, authLoading]);

  // FIX: Return just `loading` not `loading || authLoading`
  // ProtectedRoute already handles the authLoading case separately
  return { profile, loading, refresh };
}

