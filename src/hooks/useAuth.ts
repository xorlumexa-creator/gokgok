import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type AuthListener = (session: Session | null, user: User | null, loading: boolean) => void;

let cachedSession: Session | null = null;
let cachedUser: User | null = null;
let cachedLoading = true;
let initialized = false;
let listeners: AuthListener[] = [];

function notify() {
  listeners.forEach(listener => listener(cachedSession, cachedUser, cachedLoading));
}

function initAuthOnce() {
  if (initialized) return;
  initialized = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    cachedSession = session;
    cachedUser = session?.user ?? null;
    cachedLoading = false;
    notify();
  });

  supabase.auth.getSession().then(({ data: { session } }) => {
    cachedSession = session;
    cachedUser = session?.user ?? null;
    cachedLoading = false;
    notify();
  });
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
