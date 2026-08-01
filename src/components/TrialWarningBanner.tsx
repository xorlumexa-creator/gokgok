import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription, toBn } from '@/context/SubscriptionContext';

export default function TrialWarningBanner() {
  const { profile } = useProfile();
  const { trialActive, trialDaysLeft, hasActivePaidPlan, expiresAt, isLocked } = useSubscription();
  const navigate = useNavigate();
  if (!profile || profile.role === 'manager') return null;

  // Active subscription — warn if expiring within 5 days.
  if (hasActivePaidPlan && expiresAt) {
    const daysToExpiry = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
    if (daysToExpiry > 5 || daysToExpiry < 0) return null;
    return (
      <Banner
        title="⏰ সাবস্ক্রিপশন শীঘ্রই শেষ হচ্ছে"
        message={`আপনার সাবস্ক্রিপশন আর ${toBn(daysToExpiry)} দিনে শেষ। ব্যবসায় বিঘ্ন এড়াতে এখনই নবায়ন করুন।`}
        onClick={() => navigate('/subscription?focus=renew')}
        cta="এখনই নবায়ন করুন →"
      />
    );
  }

  // In trial, running low
  if (trialActive) {
    if (trialDaysLeft > 2) return null;
    return (
      <Banner
        title="⚠️ ফ্রি ট্রায়াল শীঘ্রই শেষ"
        message={`ফ্রি ট্রায়ালের আর ${toBn(trialDaysLeft)} দিন বাকি। সাবস্ক্রাইব করে ব্যবসা চালিয়ে যান।`}
        onClick={() => navigate('/subscription')}
        cta="সাবস্ক্রাইব করুন →"
      />
    );
  }

  // Trial ended, no subscription
  if (isLocked) {
    return (
      <Banner
        title="🚫 ট্রায়াল শেষ — সাবস্ক্রিপশন প্রয়োজন"
        message="৩ দিনের ফ্রি ট্রায়াল শেষ। নতুন কিছু যোগ/এডিট করতে সাবস্ক্রাইব করুন — আপনার সব তথ্য সুরক্ষিত আছে।"
        onClick={() => navigate('/subscription')}
        cta="এখনই সাবস্ক্রাইব করুন →"
      />
    );
  }

  return null;
}

function Banner({ title, message, onClick, cta }: { title: string; message: string; onClick: () => void; cta: string }) {
  return (
    <div className="mb-3 rounded-2xl border-2 border-rose-300 bg-rose-50 dark:bg-rose-950/30 p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-bold text-rose-700 dark:text-rose-300 text-sm">{title}</p>
          <p className="text-xs sm:text-sm text-rose-700/90 dark:text-rose-200 mt-1 leading-relaxed">{message}</p>
          <button onClick={onClick} className="mt-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg">{cta}</button>
        </div>
      </div>
    </div>
  );
}
