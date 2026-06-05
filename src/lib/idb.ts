// Dukan 360 — IndexedDB layer (primary local storage).
//
// All business data lives here. localStorage is still mirrored for instant
// startup (synchronous read), but IDB is the source of truth for the sync
// engine and survives larger payloads on low-end Android devices.

import { openDB, type IDBPDatabase } from 'idb';

export const DB_NAME = 'dukan360';
export const DB_VERSION = 1;

// Object store names — one per data slice.
export const STORES = [
  'products',
  'sales',
  'customers',
  'expenses',
  'preOrders',
  'bulkSaleRecords',
  'bakiPaymentRecords',
  'customEarnings',
  'suppliers',
  'meta',         // { key, value } — storeInfo, last-sync timestamps, etc.
  'syncQueue',    // pending sync operations
] as const;

export type StoreName = typeof STORES[number];

let dbPromise: Promise<IDBPDatabase> | null = null;

const idle: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback.bind(window)
    : (cb) => window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 } as IdleDeadline), 1);

export function scheduleMirror(task: () => void): void {
  if (typeof window === 'undefined') {
    task();
    return;
  }
  idle(() => task(), { timeout: 1500 });
}

export function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const name of STORES) {
          if (db.objectStoreNames.contains(name)) continue;
          if (name === 'meta') {
            db.createObjectStore(name, { keyPath: 'key' });
          } else if (name === 'syncQueue') {
            const s = db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
            s.createIndex('by_scope', 'scope');
          } else {
            const s = db.createObjectStore(name, { keyPath: 'id' });
            s.createIndex('by_createdAt', 'createdAt');
          }
        }
      },
    });
  }
  return dbPromise;
}

// ---------- generic helpers ------------------------------------------------

export async function putAll<T extends { id: string }>(store: StoreName, items: T[]): Promise<void> {
  if (!items.length) {
    // Always wipe-and-write to keep IDB consistent with React state.
    const db = await getDB();
    const tx = db.transaction(store, 'readwrite');
    await tx.objectStore(store).clear();
    await tx.done;
    return;
  }
  const db = await getDB();
  const tx = db.transaction(store, 'readwrite');
  const os = tx.objectStore(store);
  await os.clear();
  for (const item of items) os.put(item);
  await tx.done;
}

export async function getAll<T = unknown>(store: StoreName): Promise<T[]> {
  const db = await getDB();
  return (await db.getAll(store)) as T[];
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put('meta', { key, value });
}

export async function getMeta<T = unknown>(key: string): Promise<T | null> {
  const db = await getDB();
  const row = await db.get('meta', key);
  return (row?.value as T) ?? null;
}

// ---------- sync queue -----------------------------------------------------

export type QueueScope = 'baki' | 'products' | 'hisab';

export interface QueueEntry {
  id?: number;
  scope: QueueScope;
  enqueuedAt: number;
}

export async function enqueue(scope: QueueScope): Promise<void> {
  const db = await getDB();
  await db.put('syncQueue', { scope, enqueuedAt: Date.now() });
}

export async function queueCount(): Promise<number> {
  const db = await getDB();
  return db.count('syncQueue');
}

export async function queueCountByScope(scope: QueueScope): Promise<number> {
  const db = await getDB();
  const idx = db.transaction('syncQueue').store.index('by_scope');
  return idx.count(scope);
}

export async function clearQueueByScope(scope: QueueScope): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('syncQueue', 'readwrite');
  const idx = tx.store.index('by_scope');
  let cursor = await idx.openCursor(scope);
  while (cursor) { await cursor.delete(); cursor = await cursor.continue(); }
  await tx.done;
}

// ---------- one-time migration from localStorage --------------------------

const LS_STORES: Array<{ key: string; store: StoreName }> = [
  { key: 'products',           store: 'products' },
  { key: 'sales',              store: 'sales' },
  { key: 'customers',          store: 'customers' },
  { key: 'expenses',           store: 'expenses' },
  { key: 'preOrders',          store: 'preOrders' },
  { key: 'bulkSaleRecords',    store: 'bulkSaleRecords' },
  { key: 'bakiPaymentRecords', store: 'bakiPaymentRecords' },
  { key: 'customEarnings',     store: 'customEarnings' },
  { key: 'suppliers',          store: 'suppliers' },
];

const MIGRATION_FLAG = 'idb:migrated:v1';

export async function migrateFromLocalStorage(): Promise<void> {
  if (localStorage.getItem(MIGRATION_FLAG) === '1') return;
  try {
    for (const { key, store } of LS_STORES) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const items = JSON.parse(raw);
        if (Array.isArray(items)) await putAll(store, items);
      } catch { /* skip bad slice */ }
    }
    const storeInfoRaw = localStorage.getItem('storeInfo');
    if (storeInfoRaw) {
      try { await setMeta('storeInfo', JSON.parse(storeInfoRaw)); } catch { /* noop */ }
    }
    localStorage.setItem(MIGRATION_FLAG, '1');
  } catch (e) {
    console.warn('[idb] migration failed', e);
  }
}
