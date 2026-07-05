// Dukan 360 — Offline-first sync engine (v2)
// ---------------------------------------------------------------------------
// Rules (per master prompt):
//
//   scope='baki'      → customers + bakiPaymentRecords
//                       real-time sync (debounced 1.5s) when online
//
//   scope='products'  → products (catalog + stock + expiry)
//                       backup every 48 hours OR via "Backup Now"
//
//   scope='hisab'     → expenses + customEarnings (Amar Hisab)
//                       backup every 48 hours OR via "Backup Now"
//
//   NEVER synced      → sales, bulkSaleRecords, preOrders, suppliers
//                       (regenerated from local data; no cloud cost)
//
// Conflict resolution: newest updated_at wins. We store one row per
// (user_id, scope) in `user_backups` so the row's own `updated_at` is the
// timestamp.
// ---------------------------------------------------------------------------

import { supabase } from '@/integrations/supabase/client';
import { isOnline } from '@/lib/connectivity';
import {
  enqueue, clearQueueByScope, queueCount, queueCountByScope,
  getAll, getMeta, setMeta, migrateFromLocalStorage,
} from './idb';

export type SyncScope = 'baki' | 'products' | 'hisab';
export type SyncState = 'safe' | 'pending' | 'syncing' | 'error';

const BAKI_DEBOUNCE_MS = 1500;
const BACKUP_INTERVAL_MS = 48 * 60 * 60 * 1000;   // 48 hours
const RETRY_BACKOFF_MS = 30 * 1000;

const LAST_SYNC_KEY = (s: SyncScope) => `sync:last:${s}`;

interface SyncSnapshot {
  state: SyncState;
  online: boolean;
  pendingBaki: number;
  pendingProducts: number;
  pendingHisab: number;
  pendingTotal: number;
  lastBakiAt: number | null;
  lastProductsAt: number | null;
  lastHisabAt: number | null;
  nextBackupAt: number;        // earliest of products/hisab
  errorMessage?: string;
}

let snapshot: SyncSnapshot = blankSnapshot();
let listeners: Array<(s: SyncSnapshot) => void> = [];
let bakiTimer: ReturnType<typeof setTimeout> | null = null;
let backupTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight = new Set<SyncScope>();

function blankSnapshot(): SyncSnapshot {
  return {
    state: 'safe', online: isOnline(),
    pendingBaki: 0, pendingProducts: 0, pendingHisab: 0, pendingTotal: 0,
    lastBakiAt: null, lastProductsAt: null, lastHisabAt: null,
    nextBackupAt: Date.now() + BACKUP_INTERVAL_MS,
  };
}

export function getSnapshot(): SyncSnapshot { return snapshot; }

export function subscribe(fn: (s: SyncSnapshot) => void): () => void {
  listeners.push(fn);
  fn(snapshot);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

async function refreshSnapshot(extra: Partial<SyncSnapshot> = {}): Promise<void> {
  const [b, p, h, lb, lp, lh] = await Promise.all([
    queueCountByScope('baki'),
    queueCountByScope('products'),
    queueCountByScope('hisab'),
    getMeta<number>(LAST_SYNC_KEY('baki')),
    getMeta<number>(LAST_SYNC_KEY('products')),
    getMeta<number>(LAST_SYNC_KEY('hisab')),
  ]);
  const total = b + p + h;
  const nextProducts = (lp ?? 0) + BACKUP_INTERVAL_MS;
  const nextHisab = (lh ?? 0) + BACKUP_INTERVAL_MS;
  snapshot = {
    ...snapshot,
    pendingBaki: b, pendingProducts: p, pendingHisab: h, pendingTotal: total,
    lastBakiAt: lb, lastProductsAt: lp, lastHisabAt: lh,
    nextBackupAt: Math.min(nextProducts, nextHisab),
    online: isOnline(),
    state: extra.state ?? (inFlight.size > 0 ? 'syncing'
      : total > 0 ? 'pending'
      : snapshot.state === 'error' ? 'error' : 'safe'),
    ...extra,
  };
  listeners.forEach(l => { try { l(snapshot); } catch { /* noop */ } });
}

// ---------- dirty marking --------------------------------------------------

export function markDirty(scope: SyncScope): void {
  void enqueue(scope).then(() => {
    void refreshSnapshot();
    if (scope === 'baki') scheduleBakiFlush();
  });
}

function scheduleBakiFlush(): void {
  if (bakiTimer) clearTimeout(bakiTimer);
  bakiTimer = setTimeout(() => {
    bakiTimer = null;
    if (isOnline()) void performSync('baki', 'debounce');
  }, BAKI_DEBOUNCE_MS);
}

// ---------- payload builders ----------------------------------------------

async function buildPayload(scope: SyncScope): Promise<Record<string, unknown>> {
  if (scope === 'baki') {
    const [customers, bakiPaymentRecords] = await Promise.all([
      getAll('customers'), getAll('bakiPaymentRecords'),
    ]);
    return { customers, bakiPaymentRecords };
  }
  if (scope === 'products') {
    return { products: await getAll('products') };
  }
  // hisab
  const [expenses, customEarnings] = await Promise.all([
    getAll('expenses'), getAll('customEarnings'),
  ]);
  return { expenses, customEarnings };
}

// ---------- push to Supabase ----------------------------------------------

async function performSync(scope: SyncScope, reason: string): Promise<boolean> {
  if (inFlight.has(scope)) return false;
  if (!isOnline()) return false;

  const pending = await queueCountByScope(scope);
  if (pending === 0 && reason !== 'manual') return true;

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return false;

  inFlight.add(scope);
  await refreshSnapshot({ state: 'syncing' });

  try {
    const payload = await buildPayload(scope);

    // Read existing row so we can merge instead of overwriting other scopes.
    const { data: existing } = await supabase
      .from('user_backups')
      .select('data, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    const merged = { ...(existing?.data as Record<string, unknown> ?? {}), ...payload };

    // Conflict resolution — newest timestamp wins. If server is newer than
    // our last sync for this scope, prefer server data for this scope.
    const serverUpdatedAt = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0;
    const ourLast = (await getMeta<number>(LAST_SYNC_KEY(scope))) ?? 0;
    if (serverUpdatedAt > ourLast && existing?.data) {
      for (const k of Object.keys(payload)) {
        if ((existing.data as any)[k] !== undefined) merged[k] = (existing.data as any)[k];
      }
    }

    const { error } = await supabase
      .from('user_backups')
      .upsert(
        { user_id: userId, data: merged as any, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
    if (error) throw error;

    await clearQueueByScope(scope);
    await setMeta(LAST_SYNC_KEY(scope), Date.now());
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    await refreshSnapshot({ errorMessage: undefined });
    scheduleBackup();
    return true;
  } catch (e: any) {
    console.warn('[sync]', scope, 'failed:', reason, e?.message ?? e);
    await refreshSnapshot({ state: 'error', errorMessage: e?.message ?? 'Sync failed' });
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => { void performSync(scope, 'retry'); }, RETRY_BACKOFF_MS);
    return false;
  } finally {
    inFlight.delete(scope);
    await refreshSnapshot();
  }
}

// ---------- 48-hour scheduler ---------------------------------------------

async function msUntilNext(scope: SyncScope): Promise<number> {
  const last = (await getMeta<number>(LAST_SYNC_KEY(scope))) ?? 0;
  if (!last) return BACKUP_INTERVAL_MS;
  return Math.max(0, BACKUP_INTERVAL_MS - (Date.now() - last));
}

async function scheduleBackup(): Promise<void> {
  if (backupTimer) clearTimeout(backupTimer);
  const [p, h] = await Promise.all([msUntilNext('products'), msUntilNext('hisab')]);
  const delay = Math.max(5000, Math.min(p, h));
  backupTimer = setTimeout(async () => {
    if (isOnline()) {
      await performSync('products', 'interval');
      await performSync('hisab', 'interval');
    }
    void scheduleBackup();
  }, delay);
}

// ---------- public lifecycle ----------------------------------------------

let started = false;
export async function startSyncEngine(): Promise<void> {
  if (started) return;
  started = true;

  await migrateFromLocalStorage();
  await refreshSnapshot();

  window.addEventListener('online', async () => {
    await refreshSnapshot();
    if ((await queueCountByScope('baki')) > 0) await performSync('baki', 'online');
    const [p, h] = await Promise.all([msUntilNext('products'), msUntilNext('hisab')]);
    if (p === 0 && (await queueCountByScope('products')) > 0) await performSync('products', 'online');
    if (h === 0 && (await queueCountByScope('hisab')) > 0)    await performSync('hisab', 'online');
    void scheduleBackup();
  });
  window.addEventListener('offline', () => {
    void refreshSnapshot();
    if (backupTimer) { clearTimeout(backupTimer); backupTimer = null; }
  });

  void scheduleBackup();
}

/** Manual "Backup Now" — pushes baki immediately and forces a 48h backup. */
export async function syncNow(): Promise<boolean> {
  const ok1 = await performSync('baki', 'manual');
  const ok2 = await performSync('products', 'manual');
  const ok3 = await performSync('hisab', 'manual');
  return ok1 && ok2 && ok3;
}

// ---------- legacy compatibility shims ------------------------------------
// Older code calls these — keep them so the rest of the app keeps working.
export function getPendingCount(): number { return snapshot.pendingTotal; }
export function getPendingBaki(): number  { return snapshot.pendingBaki; }
export function getLastSyncAt(): number | null {
  return Math.max(
    snapshot.lastBakiAt ?? 0,
    snapshot.lastProductsAt ?? 0,
    snapshot.lastHisabAt ?? 0,
  ) || null;
}
export function getNextSyncAt(): number { return snapshot.nextBackupAt; }
                         
