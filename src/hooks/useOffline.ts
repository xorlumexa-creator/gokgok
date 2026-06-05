import { useState, useEffect } from 'react';
import { clearStore, STORES } from '@/db/indexedDB';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}

export async function clearAllOfflineData(): Promise<void> {
  await Promise.all([
    clearStore(STORES.SALES),
    clearStore(STORES.PRODUCTS),
    clearStore(STORES.BAKI),
    clearStore(STORES.HISAB),
    clearStore(STORES.SYNC_QUEUE),
    clearStore(STORES.SETTINGS),
  ]);
}
