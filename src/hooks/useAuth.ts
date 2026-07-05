import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isOnline } from '@/lib/connectivity';
import type { User, Session } from '@supabase/supabase-js';

type AuthListener = (session: Session | null, user: User | null, loading: boolean) => void;

// Synchronously peek at Supabase's persisted session in localStorage so we
// never show a spinner when there's already a saved login. Critical for
// offline / Capacitor WebView startup.
function readPersistedSession(): Session | null {
  try {
    const raw = localStorage.getItem('dukan360-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const session = parsed?.currentSession ?? parsed?.session ?? parsed;
    if (session && session.access_token && session.user) return session as Session;
    return null;
  } catch { return null; }
}

const persisted = readPersistedSession();
let cachedSession: Session | null = persisted;
let cachedUser: User | null = persisted?.user ?? null;
let cachedLoading = !persisted;
let initialized = false;
let initPromise: Promise<void> | null = null;
let listeners: AuthListener[] = [];

function notify() {
  listeners.forEach(listener => listener(cachedSession, cachedUser, cachedLoading));
}

export function primeAuthSession(session: Session | null) {
  cachedSession = session;
  cachedUser = session?.user ?? null;
  cachedLoading = false;
  notify();
}

function initAuthOnce() {
  if (initialized) return;
  initialized = true;

  // Background revalidation — never blocks UI when we already have a session.
  initPromise = supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) primeAuthSession(session);
    else { cachedLoading = false; notify(); }
  }).catch(() => {
    cachedLoading = false;
    notify();
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    // Ignore null sessions caused by transient offline token-refresh failures
    // when we already have a cached session — prevents auto-logout offline.
    if (!session && cachedSession && !isOnline()) return;
    primeAuthSession(session);
  });
}

export function getCachedAuth() {
  initAuthOnce();
  return { user: cachedUser, session: cachedSession, loading: cachedLoading, ready: initPromise };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(cachedUser);
  const [session, setSession] = useState<Session | null>(cachedSession);
  const [loading, setLoading] = useState(cachedLoading);

  useEffect(() => {
    initAuthOnce();
    const listener: AuthListener = (nextSession, nextUser, nextLoading) => {
      setSession(nextSession);
      setUser(nextUser);
      setLoading(nextLoading);
    };
    listeners.push(listener);
    listener(cachedSession, cachedUser, cachedLoading);
    return () => { listeners = listeners.filter(item => item !== listener); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, signOut };
  }
