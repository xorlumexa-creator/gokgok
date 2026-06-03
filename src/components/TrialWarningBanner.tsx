import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';

const TRIAL_DAYS = 3;

export default function TrialWarningBanner() {
  const { profile } = useProfile();
  const navigate = useNavigate();
  if (!profile || profile.role === 'manager') return null;

  const now = Date.now();
  const trialStart = new Date(profile.trial_start_date || (profile as any).created_at || now);
  const daysSinceTrial = Math.floor((now - trialStart.getTime()) / 86400000);
  const trialDaysLeft = Math.max(0, TRIAL_DAYS - daysSinceTrial);

  // Active subscription — warn if expiring within 30 days
  if (profile.subscription_status === 'active' && profile.plan_expiry) {
    const daysToExpiry = Math.ceil((new Date(profile.plan_expiry).getTime() - now) / 86400000);
    if (daysToExpiry > 30 || daysToExpiry < 0) return null;
    return (
      <Banner
        title="⏰ সাবস্ক্রিপশন শীঘ্রই শেষ হচ্ছে"
        message={`আপনার সাবস্ক্রিপশন আর ${daysToExpiry} দিনে শেষ। ব্যবসায় বিঘ্ন এড়াতে এখনই নবায়ন করুন।`}
        onClick={() => navigate('/subscription?focus=renew')}
        cta="এখনই নবায়ন করুন →"
      />
    );
  }

  // In trial
  if (trialDaysLeft > 0) {
    if (trialDaysLeft > 2) return null;
    return (
      <Banner
        title="⚠️ ফ্রি ট্রায়াল শীঘ্রই শেষ"
        message={`ফ্রি ট্রায়ালের আর ${trialDaysLeft} দিন বাকি। সাবস্ক্রাইব করে ব্যবসা চালিয়ে যান।`}
        onClick={() => navigate('/subscription')}
        cta="সাবস্ক্রাইব করুন →"
      />
    );
  }

  // Trial ended, no subscription
  return (
    <Banner
      title="🚫 ট্রায়াল শেষ — সাবস্ক্রিপশন প্রয়োজন"
      message="৩ দিনের ফ্রি ট্রায়াল শেষ। নতুন কাজ করতে সাবস্ক্রাইব করুন। ৩ মাস কোনো অ্যাটেম্পট না নিলে অ্যাকাউন্ট মুছে যাবে।"
      onClick={() => navigate('/subscription')}
      cta="এখনই সাবস্ক্রাইব করুন →"
    />
  );
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
