import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Android's network stack can take a very long time to actually fail a
// fetch() when the device is offline (much longer than a desktop browser).
// Supabase queues other requests (including data queries) behind any
// in-flight auth token refresh, so if that refresh call hangs, the whole
// app can appear to spin forever. This wraps every request the Supabase
// client makes with a hard timeout so it always fails fast instead.
const FETCH_TIMEOUT_MS = 8000;

const timeoutFetch: typeof fetch = (input, init) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  // Respect any signal the caller already passed in, by aborting our
  // controller if theirs aborts too.
  if (init?.signal) {
    if (init.signal.aborted) controller.abort();
    else init.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    window.clearTimeout(timeoutId);
  });
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'dukan360-auth',
  },
  global: {
    fetch: timeoutFetch,
  },
});
