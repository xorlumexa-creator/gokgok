import { useState, useEffect } from 'react';
import { RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';
import { getSyncStatus, onSyncStatusChange, triggerSync, SyncStatus } from '@/lib/syncEngine';

export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>('synced');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const initial = getSyncStatus();
    setStatus(initial.status);
    setLastSync(initial.lastSync);

    const unsubscribe = onSyncStatusChange((newStatus, newLastSync) => {
      setStatus(newStatus);
      setLastSync(newLastSync);
      setSyncing(newStatus === 'syncing');
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    await triggerSync();
    setSyncing(false);
  };

  const getTimeAgo = (date: Date | null): string => {
    if (!date) return '';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'এইমাত্র';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} মিনিট আগে`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ঘণ্টা আগে`;
  };

  return (
    <div className="flex items-center gap-2">
      {status === 'synced' && (
        <div className="flex items-center gap-1.5 text-xs text-profit">
          <Wifi className="w-3.5 h-3.5" />
          <span>সিঙ্ক ✓</span>
        </div>
      )}
      {status === 'syncing' && (
        <div className="flex items-center gap-1.5 text-xs text-amber-500">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>সিঙ্ক হচ্ছে...</span>
        </div>
      )}
      {status === 'offline' && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <WifiOff className="w-3.5 h-3.5" />
          <span>অফলাইন</span>
        </div>
      )}
      {lastSync && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {getTimeAgo(lastSync)}
        </span>
      )}
      <button
        onClick={handleManualSync}
        disabled={syncing || status === 'offline'}
        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
        title="সিঙ্ক করুন"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}