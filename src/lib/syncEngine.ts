// Dukan 360 Smart Sync Engine
// Hybrid offline-first queue with 1-hour delayed sync to Supabase.
// Strategy: keep all shop data in localStorage as the working DB.
// On a 1-hour interval (or when internet returns after >=1hr), snapshot
// the relevant localStorage keys and upsert to public.user_backups.

import { supabase } from '@/integrations/supabase/client';

const STORE_KEYS = [
  'storeInfo',
  'products',
  'sales',
  'customers',
  'expenses',
  'preOrders',
  'bulkSaleRecords',
  'bakiPaymentRecords',
  'customEarnings',
  'suppliers',
] as const;

const LAST_SYNC_KEY = 'sync:lastSyncAt';
const PENDING_FLAG_KEY = 'sync:pendingSince';
const PENDING_COUNT_KEY = 'sync:pendingCount';
const SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export type SyncState = 'safe' | 'pending' | 'syncing' | 'error';

interface SyncSnapshot {
  state: SyncState;
  pendingCount: number;
  lastSyncAt: number | null;
  online: boolean;
  errorMessage?: string;
}

let currentState: SyncState = 'safe';
let errorMessage: string | undefined;
let listeners: ((s: SyncSnapshot) => void)[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;

function getNumber(key: string): number | null {
  const v = localStorage.getItem(key);
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export function getPendingCount(): number {
  return getNumber(PENDING_COUNT_KEY) ?? 0;
}

export function getLastSyncAt(): number | null {
  return getNumber(LAST_SYNC_KEY);
}

export function getSnapshot(): SyncSnapshot {
  return {
    state: currentState,
    pendingCount: getPendingCount(),
    lastSyncAt: getLastSyncAt(),
    online: navigator.onLine,
    errorMessage,
  };
}

function emit() {
  const snap = getSnapshot();
  listeners.forEach((l) => {
    try { l(snap); } catch { /* ignore */ }
  });
}

export function subscribe(listener: (s: SyncSnapshot) => void): () => void {
  listeners.push(listener);
  listener(getSnapshot());
  return () => { listeners = listeners.filter((l) => l !== listener); };
}

/**
 * Call after any data mutation to mark there is unsynced data.
 * Idempotent and very cheap.
 */
export function markDirty(): void {
  const prev = getPendingCount();
  localStorage.setItem(PENDING_COUNT_KEY, String(prev + 1));
  if (!localStorage.getItem(PENDING_FLAG_KEY)) {
    localStorage.setItem(PENDING_FLAG_KEY, String(Date.now()));
  }
  if (currentState === 'safe') currentState = 'pending';
  emit();
}

function buildPayload() {
  const payload: Record<string, unknown> = {};
  for (const k of STORE_KEYS) {
    const raw = localStorage.getItem(k);
    if (raw == null) continue;
    try { payload[k] = JSON.parse(raw); } catch { /* skip */ }
  }
  return payload;
}

async function performSync(reason: string): Promise<boolean> {
  if (inFlight) return false;
  if (!navigator.onLine) return false;

  const pending = getPendingCount();
  if (pending === 0) {
    // nothing to push but refresh timestamp so user sees "just now"
    return true;
  }

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return false; // not logged in, will retry later

  inFlight = true;
  currentState = 'syncing';
  errorMessage = undefined;
  emit();

  try {
    const snapshotBefore = pending;
    const payload = buildPayload();

    const { error } = await supabase
      .from('user_backups')
      .upsert({ user_id: userId, data: payload as any, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    if (error) throw error;

    // success: only clear the pending count that existed before the upload
    // (new writes during sync should remain pending).
    const after = getPendingCount();
    const remaining = Math.max(0, after - snapshotBefore);
    localStorage.setItem(PENDING_COUNT_KEY, String(remaining));
    if (remaining === 0) localStorage.removeItem(PENDING_FLAG_KEY);
    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));

    currentState = remaining > 0 ? 'pending' : 'safe';
    emit();
    return true;
  } catch (e: any) {
    console.warn('[sync] failed:', reason, e?.message ?? e);
    currentState = 'error';
    errorMessage = e?.message ?? 'Sync failed';
    emit();
    return false;
  } finally {
    inFlight = false;
  }
}

function msUntilNextSync(): number {
  const last = getLastSyncAt();
  if (!last) return SYNC_INTERVAL_MS;
  const elapsed = Date.now() - last;
  return Math.max(0, SYNC_INTERVAL_MS - elapsed);
}

function schedule() {
  if (timer) clearTimeout(timer);
  const delay = msUntilNextSync();
  timer = setTimeout(async () => {
    await performSync('interval');
    schedule();
  }, Math.max(5000, delay)); // never tighter than 5s
}

let started = false;
export function startSyncEngine(): void {
  if (started) return;
  started = true;

  // restore state on boot
  currentState = getPendingCount() > 0 ? 'pending' : 'safe';
  emit();

  window.addEventListener('online', async () => {
    emit();
    if (msUntilNextSync() === 0 && getPendingCount() > 0) {
      await performSync('online-resume');
    }
    schedule();
  });
  window.addEventListener('offline', () => {
    emit();
    if (timer) { clearTimeout(timer); timer = null; }
  });

  schedule();
}

export async function syncNow(): Promise<boolean> {
  const ok = await performSync('manual');
  schedule();
  return ok;
}
