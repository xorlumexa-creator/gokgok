/**
 * Cache Supabase (or any async) query responses in localStorage and
 * transparently fall back to the cached value when offline or on error.
 *
 * Usage:
 *   const { data, error } = await cachedFetch('products', () =>
 *     supabase.from('products').select('*')
 *   );
 */

import { isOnline } from '@/lib/connectivity';

const PREFIX = 'sbcache:';

export function readCache<T = unknown>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}

export function writeCache<T = unknown>(key: string, data: T): void {
  try {
    localStorage.setItem(
      PREFIX + key,
      JSON.stringify({ data, ts: Date.now() })
    );
  } catch {
    /* quota — ignore */
  }
}

export async function cachedFetch<T = unknown>(
  key: string,
  fetcher: () => Promise<{ data: T | null; error: unknown }>
): Promise<{ data: T | null; error: unknown; fromCache: boolean }> {
  const offline = !isOnline();

  if (offline) {
    const cached = readCache<T>(key);
    return { data: cached, error: null, fromCache: true };
  }

  try {
    const result = await fetcher();
    if (!result.error && result.data != null) {
      writeCache(key, result.data);
      return { ...result, fromCache: false };
    }
    // On error, fall back to cache if available.
    const cached = readCache<T>(key);
    if (cached != null) return { data: cached, error: null, fromCache: true };
    return { ...result, fromCache: false };
  } catch (error) {
    const cached = readCache<T>(key);
    if (cached != null) return { data: cached, error: null, fromCache: true };
    return { data: null, error, fromCache: false };
  }
}
