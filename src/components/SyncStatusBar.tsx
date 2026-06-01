import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { getSnapshot, subscribe, syncNow } from '@/lib/syncEngine';

function timeAgo(ts: number | null): string {
  if (!ts) return 'এখনও সিঙ্ক হয়নি';
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return 'এইমাত্র';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} মিনিট আগে`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ঘণ্টা আগে`;
  const d = Math.floor(hr / 24);
  return `${d} দিন আগে`;
}

const RISKS = [
  'অ্যাপ আনইনস্টল',
  'ব্রাউজার হিস্টোরি / সাইট ডেটা ক্লিয়ার',
  'অ্যাপ স্টোরেজ ক্লিয়ার',
  'ব্রাউজার ক্যাশ ও স্টোরেজ ক্লিয়ার',
  'ফ্যাক্টরি রিসেট',
  'ফোন নষ্ট / রিসেট',
  'ব্রাউজার প্রোফাইল পরিবর্তন',
  'ইনকগনিটো / প্রাইভেট ব্রাউজিং',
];

export function SyncStatusBar() {
  const [snap, setSnap] = useState(getSnapshot());
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);

  useEffect(() => subscribe(setSnap), []);
  // re-render every 30s so "ago" stays fresh
  useEffect(() => {
    const i = setInterval(() => force((x) => x + 1), 30000);
    return () => clearInterval(i);
  }, []);

  const isSafe = snap.pendingCount === 0 && snap.state !== 'error';
  const isSyncing = snap.state === 'syncing';

  const tone = isSafe
    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';

  return (
    <div className={`rounded-xl border ${tone} p-3`}>
      <div className="flex items-center gap-2">
        {isSyncing ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : isSafe ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <AlertTriangle className="w-4 h-4" />
        )}
        <div className="flex-1 min-w-0">
          {isSafe ? (
            <div className="text-sm font-medium">🟢 আপনার ডাটা নিরাপদভাবে সেভ হয়েছে</div>
          ) : (
            <div className="text-sm font-medium">
              🔴 সতর্কতা: {snap.pendingCount} টি তথ্য এখনও ক্লাউডে সেভ হয়নি
            </div>
          )}
          <div className="text-xs opacity-80 flex items-center gap-1 mt-0.5">
            {!snap.online && <WifiOff className="w-3 h-3" />}
            শেষ সিঙ্ক: {timeAgo(snap.lastSyncAt)}
            {!snap.online && ' • অফলাইন'}
          </div>
        </div>
        {!isSafe && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-xs underline shrink-0"
          >
            {open ? 'বন্ধ করুন' : 'বিস্তারিত'}
          </button>
        )}
      </div>

      {!isSafe && open && (
        <div className="mt-3 text-xs space-y-2">
          <div>এই অবস্থায় নিচের কাজগুলো করলে ডাটা হারাতে পারেন:</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {RISKS.map((r) => (
              <li key={r}>❌ {r}</li>
            ))}
          </ul>
          <div className="opacity-80">
            ইন্টারনেট পাওয়া গেলে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে (প্রতি ১ ঘণ্টায়)।
          </div>
          {snap.online && (
            <button
              onClick={() => syncNow()}
              className="mt-1 inline-flex items-center gap-1 px-2 py-1 rounded bg-red-600 text-white text-xs"
              disabled={isSyncing}
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              এখনই সিঙ্ক করুন
            </button>
          )}
          {snap.errorMessage && (
            <div className="opacity-80">সিঙ্ক সম্পূর্ণ হয়নি। ইন্টারনেট চেক করুন।</div>
          )}
        </div>
      )}
    </div>
  );
}
