import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Clock } from 'lucide-react';
import { getSyncStatus, onSyncStatusChange, SyncStatus } from '@/lib/syncEngine';

export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>('safe');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const initial = getSyncStatus();
    setStatus(initial.status);
    setLastSync(initial.lastSync);

    const unsubscribe = onSyncStatusChange((newStatus, newLastSync) => {
      setStatus(newStatus);
      setLastSync(newLastSync);
    });
    return unsubscribe;
  }, []);

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
      {status === 'offline' ? (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <WifiOff className="w-3.5 h-3.5" />
          <span>অফলাইন</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-profit">
          <Wifi className="w-3.5 h-3.5" />
          <span>ডেটা নিরাপদ</span>
        </div>
      )}
      {lastSync && status !== 'offline' && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {getTimeAgo(lastSync)}
        </span>
      )}
    </div>
  );
}
