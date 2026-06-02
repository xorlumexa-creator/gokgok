import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, WifiOff, ShieldCheck } from 'lucide-react';
import { getSnapshot, subscribe, syncNow } from '@/lib/syncEngine';

const BN_DIGITS = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
const toBn = (s: string | number) =>
  String(s).replace(/\d/g, (d) => BN_DIGITS[+d]);

function bnClock(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? 'সকাল' : h < 16 ? 'দুপুর' : h < 19 ? 'বিকাল' : 'রাত';
  h = h % 12 || 12;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${ampm} ${toBn(h)}:${toBn(mm)}`;
}

function bnDayLabel(ts: number): string {
  const target = new Date(ts); target.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((target.getTime() - today.getTime()) / (24*60*60*1000));
  if (diff <= 0) return 'আজ';
  if (diff === 1) return 'আগামীকাল';
  return `${toBn(diff)} দিন পর`;
}

function ago(ts: number | null): string {
  if (!ts) return 'এখনও সিঙ্ক হয়নি';
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return 'এইমাত্র';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${toBn(min)} মিনিট আগে`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${toBn(hr)} ঘণ্টা আগে`;
  return `${toBn(Math.floor(hr/24))} দিন আগে`;
}

export function SyncStatusBar() {
  const [snap, setSnap] = useState(getSnapshot());
  const [, force] = useState(0);

  useEffect(() => subscribe(setSnap), []);
  useEffect(() => {
    const i = setInterval(() => force((x) => x + 1), 30000);
    return () => clearInterval(i);
  }, []);

  const isSafe = snap.pendingCount === 0 && snap.state !== 'error';
  const isSyncing = snap.state === 'syncing';
  const nextLabel = `${bnDayLabel(snap.nextSyncAt!)} ${bnClock(snap.nextSyncAt!)}`;

  const tone = isSafe
    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100';

  return (
    <div className={`rounded-xl border ${tone} p-3 space-y-2`}>
      <div className="flex items-start gap-2">
        {isSyncing ? (
          <RefreshCw className="w-5 h-5 animate-spin mt-0.5 shrink-0" />
        ) : isSafe ? (
          <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {isSafe ? (
            <div className="text-sm font-semibold">🛡️ আপনার ডেটা নিরাপদ আছে</div>
          ) : (
            <div className="text-sm font-semibold">
              ⚠️ {toBn(snap.pendingCount)} টি তথ্য এখনও ক্লাউডে সেভ হয়নি
            </div>
          )}
          <div className="text-xs opacity-90 mt-0.5">
            পরবর্তী সিঙ্ক: <span className="font-medium">{nextLabel}</span>
          </div>
          <div className="text-[11px] opacity-75 flex items-center gap-1 mt-0.5">
            {!snap.online && <WifiOff className="w-3 h-3" />}
            শেষ সিঙ্ক: {ago(snap.lastSyncAt)}{!snap.online && ' • অফলাইন'}
          </div>
        </div>
      </div>

      <div className="text-[11px] leading-relaxed opacity-90 border-t border-current/10 pt-2">
        ডেটা হারানো এড়াতে এর আগে <b>অ্যাপ uninstall</b>, <b>browser data clear</b> বা
        <b> app storage delete</b> করবেন না। অনলাইনে থাকলে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে ✅
      </div>

      {!isSafe && snap.online && (
        <button
          onClick={() => syncNow()}
          disabled={isSyncing}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium disabled:opacity-60"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          এখনই সিঙ্ক করুন
        </button>
      )}
    </div>
  );
}
