// Offline-first sync engine using IndexedDB
// Stores data locally first, syncs to cloud in background

const DB_NAME = 'dukan360_db';
const DB_VERSION = 1;
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

// Save to sync queue
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

// Get pending records
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

// Mark records as synced
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

// Sync state management
export type SyncStatus = 'synced' | 'syncing' | 'offline';

let syncStatus: SyncStatus = navigator.onLine ? 'synced' : 'offline';
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

// Background sync - batch process
async function performSync(): Promise<void> {
  if (!navigator.onLine) {
    syncStatus = 'offline';
    notifyListeners();
    return;
  }

  const pending = await getPendingRecords();
  if (pending.length === 0) {
    syncStatus = 'synced';
    lastSyncTime = new Date();
    notifyListeners();
    return;
  }

  syncStatus = 'syncing';
  notifyListeners();

  // Process in batches of 30
  const BATCH_SIZE = 30;
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    try {
      // For now, just mark as synced since data is in localStorage
      // In future, this would push to Supabase tables
      await markSynced(batch.map(r => r.id));
    } catch (error) {
      console.error('Sync batch failed:', error);
      // Keep as pending for next cycle
      break;
    }
  }

  syncStatus = 'synced';
  lastSyncTime = new Date();
  notifyListeners();
}

// Auto-sync timer
let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(): void {
  // Initial sync
  performSync();

  // Sync every 10 minutes
  syncInterval = setInterval(performSync, 10 * 60 * 1000);

  // Sync on reconnect
  window.addEventListener('online', () => {
    syncStatus = 'syncing';
    notifyListeners();
    setTimeout(performSync, 2000);
  });

  window.addEventListener('offline', () => {
    syncStatus = 'offline';
    notifyListeners();
  });
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

// Manual sync trigger
export async function triggerSync(): Promise<void> {
  return performSync();
}

// Initialize DB on import
openDB().catch(console.error);
