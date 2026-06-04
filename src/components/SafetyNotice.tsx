import { ShieldCheck } from 'lucide-react';

/**
 * Permanent informational banner shown across pages.
 * Explains what is auto-backed-up vs. locally-generated, and warns
 * against uninstalling the app before backups complete.
 */
export function SafetyNotice() {
  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-3 text-emerald-900 dark:text-emerald-100">
      <div className="flex items-start gap-2">
        <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" />
        <div className="text-[12px] leading-relaxed">
          <b>পণ্য, আমার হিসাব ও বাকি</b> তথ্য স্বয়ংক্রিয়ভাবে ব্যাকআপ হয়।
          রিপোর্ট ও বিশ্লেষণ স্থানীয় ডেটা থেকে তৈরি হয়।
          ব্যাকআপ সম্পন্ন হওয়ার আগে অ্যাপটি <b>uninstall</b> বা <b>browser data clear</b> করবেন না।
        </div>
      </div>
    </div>
  );
}

export default SafetyNotice;
