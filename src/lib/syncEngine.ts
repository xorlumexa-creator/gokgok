// Offline-first sync engine using IndexedDB
// 20-minute auto sync, no manual trigger, silent background operation

const DB_NAME = 'dukan360_db';
const DB_VERSION = 2;
const STORES = ['products', 'sales', 'customers', 'sync_queue'] as const;

let db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { db = request.result; resolve(db); };
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      STORES.forEach(store => {
        if (!database.objectStoreNames.contains(store)) {
          const objStore = database.createObjectStore(store, { keyPath: 'id' });
          objStore.createIndex('sync_status', 'sync_status', { unique: false });
          objStore.createIndex('updated_at', 'updated_at', { unique: false });
        }
      });
    };
  });
}

export interface SyncRecord {
  id: string;
  type: 'product' | 'sale' | 'customer';
  action: 'create' | 'update' | 'delete';
  data: any;
  sync_status: 'pending' | 'synced';
  updated_at: number;
  created_at: number;
}

export async function queueSync(record: Omit<SyncRecord, 'sync_status' | 'created_at'>): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    store.put({ ...record, sync_status: 'pending', created_at: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingRecords(): Promise<SyncRecord[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('sync_queue', 'readonly');
    const store = tx.objectStore('sync_queue');
    const index = store.index('sync_status');
    const request = index.getAll('pending');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function markSynced(ids: string[]): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    ids.forEach(id => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        if (getReq.result) {
          store.put({ ...getReq.result, sync_status: 'synced' });
        }
      };
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Clean up old synced sales (>30 days)
async function cleanOldSyncedSales(): Promise<void> {
  const database = await openDB();
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  return new Promise((resolve, reject) => {
    const tx = database.transaction('sync_queue', 'readwrite');
    const store = tx.objectStore('sync_queue');
    const request = store.index('sync_status').getAll('synced');
    request.onsuccess = () => {
      const records: SyncRecord[] = request.result;
      records.forEach(r => {
        if (r.type === 'sale' && r.created_at < thirtyDaysAgo) {
          store.delete(r.id);
        }
      });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Sync state management
export type SyncStatus = 'safe' | 'syncing' | 'offline';

let syncStatus: SyncStatus = navigator.onLine ? 'safe' : 'offline';
let lastSyncTime: Date | null = null;
let syncListeners: ((status: SyncStatus, lastSync: Date | null) => void)[] = [];

export function getSyncStatus(): { status: SyncStatus; lastSync: Date | null } {
  return { status: syncStatus, lastSync: lastSyncTime };
}

export function onSyncStatusChange(listener: (status: SyncStatus, lastSync: Date | null) => void): () => void {
  syncListeners.push(listener);
  return () => { syncListeners = syncListeners.filter(l => l !== listener); };
}

function notifyListeners() {
  syncListeners.forEach(l => l(syncStatus, lastSyncTime));
}

// Background sync
async function performSync(): Promise<void> {
  if (!navigator.onLine) {
    syncStatus = 'offline';
    notifyListeners();
    return;
  }

  const pending = await getPendingRecords();
  if (pending.length === 0) {
    syncStatus = 'safe';
    lastSyncTime = new Date();
    notifyListeners();
    // Clean old data
    await cleanOldSyncedSales().catch(() => {});
    return;
  }

  syncStatus = 'syncing';
  notifyListeners();

  const BATCH_SIZE = 30;
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    try {
      await markSynced(batch.map(r => r.id));
    } catch (error) {
      console.error('Sync batch failed:', error);
      break;
    }
  }

  syncStatus = 'safe';
  lastSyncTime = new Date();
  notifyListeners();
}

// 20-minute auto sync timer
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSyncCycle() {
  if (syncTimer) clearTimeout(syncTimer);
  if (!navigator.onLine) return;
  
  syncTimer = setTimeout(async () => {
    await performSync();
    // Schedule next cycle only if still online
    if (navigator.onLine) scheduleSyncCycle();
  }, 20 * 60 * 1000); // 20 minutes
}

export function startAutoSync(): void {
  // Initial sync after short delay
  setTimeout(() => {
    performSync().then(() => {
      if (navigator.onLine) scheduleSyncCycle();
    });
  }, 3000);

  window.addEventListener('online', () => {
    syncStatus = 'safe';
    notifyListeners();
    // Wait 20 min before syncing on reconnect
    scheduleSyncCycle();
  });

  window.addEventListener('offline', () => {
    syncStatus = 'offline';
    notifyListeners();
    if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
  });
}

export function stopAutoSync(): void {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
}

// Initialize DB on import
openDB().catch(console.error);
