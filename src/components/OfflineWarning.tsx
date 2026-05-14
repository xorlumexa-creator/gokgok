import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export function OfflineWarning() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="mt-6 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>
        অ্যাপ আনইনস্টল করিয়েন না বা ব্রাউজার ডেটা ডিলিট করিয়েন না, তাহলে সব ডেটা মুছে যাবে।
      </span>
    </div>
  );
}
