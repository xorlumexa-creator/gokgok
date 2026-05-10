import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';

const TRIAL_DAYS = 5;
const GRACE_DAYS = 30; // after trial ends

export default function TrialWarningBanner() {
  const { profile } = useProfile();
  const navigate = useNavigate();
  if (!profile || profile.role === 'manager') return null;
  if (profile.subscription_status === 'active') return null;

  const created = new Date(profile.trial_start_date || (profile as any).created_at || Date.now());
  const daysSince = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
  const totalAllowed = TRIAL_DAYS + GRACE_DAYS;
  const daysLeft = Math.max(0, totalAllowed - daysSince);
  const trialDaysLeft = Math.max(0, TRIAL_DAYS - daysSince);
  const trialOver = daysSince >= TRIAL_DAYS;

  if (daysSince < 1) return null; // hide on day 0

  return (
    <div className="mb-3 rounded-2xl border-2 border-rose-300 bg-rose-50 dark:bg-rose-950/30 p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-bold text-rose-700 dark:text-rose-300 text-sm">
            ⚠️ সাবধানতা — অ্যাকাউন্ট মুছে যেতে পারে
          </p>
          <p className="text-xs sm:text-sm text-rose-700/90 dark:text-rose-200 mt-1 leading-relaxed">
            {trialOver
              ? `আপনার ৫ দিনের ফ্রি ট্রায়াল শেষ। আর ${daysLeft} দিনের মধ্যে সাবস্ক্রাইব না করলে আপনার অ্যাকাউন্ট ও সমস্ত তথ্য স্বয়ংক্রিয়ভাবে মুছে যাবে।`
              : `ফ্রি ট্রায়ালের আর ${trialDaysLeft} দিন বাকি। ট্রায়াল শেষে ৩০ দিনের মধ্যে সাবস্ক্রাইব না করলে অ্যাকাউন্ট মুছে যাবে।`}
          </p>
          <button
            onClick={() => navigate('/subscription')}
            className="mt-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg"
          >
            এখনই সাবস্ক্রাইব করুন →
          </button>
        </div>
      </div>
    </div>
  );
}
