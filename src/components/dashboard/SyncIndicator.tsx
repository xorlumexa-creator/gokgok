import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { getSyncStatus, onSyncStatusChange, getPendingRecords, SyncStatus } from '@/lib/syncEngine';

export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>('safe');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pending, setPending] = useState(0);

  const refreshPending = async () => {
    try { setPending((await getPendingRecords()).length); } catch { /* ignore */ }
  };

  useEffect(() => {
    const initial = getSyncStatus();
    setStatus(initial.status);
    setLastSync(initial.lastSync);
    refreshPending();

    const unsubscribe = onSyncStatusChange((newStatus, newLastSync) => {
      setStatus(newStatus);
      setLastSync(newLastSync);
      refreshPending();
    });
    const interval = setInterval(refreshPending, 30 * 1000);
    return () => { unsubscribe(); clearInterval(interval); };
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

  let icon, label, cls;
  if (status === 'offline') {
    icon = <WifiOff className="w-3.5 h-3.5" />; label = 'অফলাইন'; cls = 'text-destructive';
  } else if (status === 'syncing') {
    icon = <RefreshCw className="w-3.5 h-3.5 animate-spin" />; label = 'সিঙ্ক হচ্ছে...'; cls = 'text-primary';
  } else if (pending > 0) {
    icon = <AlertCircle className="w-3.5 h-3.5" />; label = `${pending} টি ডাটা সেভ হয়নি`; cls = 'text-amber-600';
  } else {
    icon = <Wifi className="w-3.5 h-3.5" />; label = 'সব ডাটা সেভ হয়েছে'; cls = 'text-profit';
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 text-xs ${cls}`}>
        {icon}
        <span>{label}</span>
      </div>
      {lastSync && status !== 'offline' && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          শেষ সিঙ্ক: {getTimeAgo(lastSync)}
        </span>
      )}
    </div>
  );
}
