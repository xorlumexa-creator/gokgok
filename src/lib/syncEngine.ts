// Dukan 360 — Smart Hybrid Sync Engine
// ---------------------------------------------------------------------------
// Rules:
//   • Baki (credit) data        → real-time sync when online, queued offline
//   • Everything else           → batched, synced ONLY every 8 hours
//   • Offline                   → all writes queue in localStorage (working DB)
//   • When network returns      → baki syncs immediately; the rest waits for
//                                 the 8-hour window to elapse, then auto-syncs
// ---------------------------------------------------------------------------

import { supabase } from '@/integrations/supabase/client';

// Keys persisted in localStorage that make up a full user backup.
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

// "Baki" keys — these mutations trigger an immediate (real-time) sync when
// the device is online. Other keys are batched into the 8-hour cycle.
const BAKI_KEYS = new Set<string>(['customers', 'bakiPaymentRecords']);

const LAST_SYNC_KEY = 'sync:lastSyncAt';
const PENDING_COUNT_KEY = 'sync:pendingCount';
const PENDING_BAKI_KEY = 'sync:pendingBaki';

const SYNC_INTERVAL_MS = 8 * 60 * 60 * 1000; // 8 hours
const BAKI_DEBOUNCE_MS = 1500;               // coalesce rapid baki edits
const RETRY_BACKOFF_MS = 30 * 1000;          // retry every 30s on failure

export type SyncScope = 'baki' | 'other';
export type SyncState = 'safe' | 'pending' | 'syncing' | 'error';

interface SyncSnapshot {
  state: SyncState;
  pendingCount: number;
  pendingBaki: number;
  lastSyncAt: number | null;
  nextSyncAt: number | null;
  online: boolean;
  errorMessage?: string;
}

let currentState: SyncState = 'safe';
let errorMessage: string | undefined;
let listeners: Array<(s: SyncSnapshot) => void> = [];
let intervalTimer: ReturnType<typeof setTimeout> | null = null;
let bakiDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;

// ---------- helpers --------------------------------------------------------

function num(key: string): number {
  const v = localStorage.getItem(key);
  if (!v) return 0;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

export function getPendingCount(): number { return num(PENDING_COUNT_KEY); }
export function getPendingBaki(): number  { return num(PENDING_BAKI_KEY); }
export function getLastSyncAt(): number | null {
  const v = localStorage.getItem(LAST_SYNC_KEY);
  return v ? parseInt(v, 10) : null;
}
export function getNextSyncAt(): number {
  const last = getLastSyncAt();
  return (last ?? Date.now()) + SYNC_INTERVAL_MS;
}

export function getSnapshot(): SyncSnapshot {
  return {
    state: currentState,
    pendingCount: getPendingCount(),
    pendingBaki: getPendingBaki(),
    lastSyncAt: getLastSyncAt(),
    nextSyncAt: getNextSyncAt(),
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    errorMessage,
  };
}

function emit() {
  const snap = getSnapshot();
  listeners.forEach((l) => { try { l(snap); } catch { /* noop */ } });
}

export function subscribe(listener: (s: SyncSnapshot) => void): () => void {
  listeners.push(listener);
  listener(getSnapshot());
  return () => { listeners = listeners.filter((l) => l !== listener); };
}

// ---------- dirty marking --------------------------------------------------

/**
 * Mark unsynced data. Pass scope='baki' for credit-book mutations so they
 * are pushed to the cloud immediately (when online). Everything else is
 * batched into the 8-hour cycle.
 */
export function markDirty(scope: SyncScope = 'other'): void {
  localStorage.setItem(PENDING_COUNT_KEY, String(getPendingCount() + 1));
  if (scope === 'baki') {
    localStorage.setItem(PENDING_BAKI_KEY, String(getPendingBaki() + 1));
    scheduleBakiFlush();
  }
  if (currentState === 'safe') currentState = 'pending';
  emit();
}

function scheduleBakiFlush() {
  if (bakiDebounceTimer) clearTimeout(bakiDebounceTimer);
  bakiDebounceTimer = setTimeout(() => {
    bakiDebounceTimer = null;
    if (navigator.onLine) void performSync('baki');
  }, BAKI_DEBOUNCE_MS);
}

// ---------- payload + push -------------------------------------------------

function buildPayload(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of STORE_KEYS) {
    const raw = localStorage.getItem(k);
    if (raw == null) continue;
    try { out[k] = JSON.parse(raw); } catch { /* skip bad slice */ }
  }
  return out;
}

async function performSync(reason: string): Promise<boolean> {
  if (inFlight) return false;
  if (!navigator.onLine) return false;

  const beforeCount = getPendingCount();
  const beforeBaki = getPendingBaki();
  if (beforeCount === 0 && beforeBaki === 0 && reason !== 'manual') return true;

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return false;

  inFlight = true;
  currentState = 'syncing';
  errorMessage = undefined;
  emit();

  try {
    const payload = buildPayload();
    const { error } = await supabase
      .from('user_backups')
      .upsert(
        { user_id: userId, data: payload as any, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
    if (error) throw error;

    // Only clear the counts that existed before this upload; new writes
    // during the request remain pending and trigger another cycle.
    const afterCount = getPendingCount();
    const afterBaki = getPendingBaki();
    const remainingCount = Math.max(0, afterCount - beforeCount);
    const remainingBaki = Math.max(0, afterBaki - beforeBaki);
    localStorage.setItem(PENDING_COUNT_KEY, String(remainingCount));
    localStorage.setItem(PENDING_BAKI_KEY, String(remainingBaki));
    localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));

    currentState = remainingCount > 0 ? 'pending' : 'safe';
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    emit();
    scheduleInterval(); // reset 8-hour timer from "now"
    return true;
  } catch (e: any) {
    console.warn('[sync] failed:', reason, e?.message ?? e);
    currentState = 'error';
    errorMessage = e?.message ?? 'Sync failed';
    emit();
    // background retry
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => { void performSync('retry'); }, RETRY_BACKOFF_MS);
    return false;
  } finally {
    inFlight = false;
  }
}

// ---------- interval scheduler --------------------------------------------

function msUntilNextInterval(): number {
  const last = getLastSyncAt();
  if (!last) return SYNC_INTERVAL_MS;
  return Math.max(0, SYNC_INTERVAL_MS - (Date.now() - last));
}

function scheduleInterval() {
  if (intervalTimer) clearTimeout(intervalTimer);
  const delay = Math.max(5000, msUntilNextInterval());
  intervalTimer = setTimeout(async () => {
    await performSync('interval');
    scheduleInterval();
  }, delay);
}

// ---------- public lifecycle ----------------------------------------------

let started = false;
export function startSyncEngine(): void {
  if (started) return;
  started = true;

  currentState = getPendingCount() > 0 ? 'pending' : 'safe';
  emit();

  window.addEventListener('online', async () => {
    emit();
    // 1) baki always tries immediately on reconnect
    if (getPendingBaki() > 0) await performSync('online-baki');
    // 2) the rest only if the 8-hour window already elapsed
    if (msUntilNextInterval() === 0 && getPendingCount() > 0) {
      await performSync('online-interval');
    }
    scheduleInterval();
  });
  window.addEventListener('offline', () => {
    emit();
    if (intervalTimer) { clearTimeout(intervalTimer); intervalTimer = null; }
  });

  scheduleInterval();
}

export async function syncNow(): Promise<boolean> {
  const ok = await performSync('manual');
  scheduleInterval();
  return ok;
}
