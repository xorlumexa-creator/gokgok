import { Lock, BookOpen } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription, SALES_CREDIT_LIMIT } from '@/context/SubscriptionContext';

const TRIAL_DAYS = 3;
const ALWAYS_ALLOWED = ['/credit-book', '/profile', '/notifications'];

export function SubscriptionLock({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();
  const { salesCreditUsed } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  if (!profile) return <>{children}</>;
  if (profile.role === 'manager') return <>{children}</>;

  const planActive = profile.subscription_status === 'active'
    && profile.plan_expiry
    && new Date(profile.plan_expiry).getTime() > Date.now();

  const tempActive = profile.temporary_access
    && profile.temporary_expiry
    && new Date(profile.temporary_expiry).getTime() > Date.now();

  const trialStart = new Date(profile.trial_start_date || (profile as any).created_at || Date.now());
  const trialDaysLeft = Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - trialStart.getTime()) / 86400000));
  const trialActive = trialDaysLeft > 0;

  const salesExceeded = salesCreditUsed >= SALES_CREDIT_LIMIT;
  const needsSubscription = !planActive && !tempActive && !trialActive;
  const isLocked = needsSubscription || salesExceeded;

  if (!isLocked) return <>{children}</>;
  if (ALWAYS_ALLOWED.includes(location.pathname)) return <>{children}</>;

  const reason = salesExceeded
    ? 'এই মাসের ১২,০০০ বিক্রির সীমা পূর্ণ হয়েছে। ব্যবসা চালিয়ে যেতে প্ল্যান নবায়ন করুন।'
    : 'আপনার ট্রায়াল/সাবস্ক্রিপশন শেষ। সাবস্ক্রিপশন নিন।';

  // FIX: Removed `relative min-h-[60vh]` wrapper and `absolute inset-0` overlay
  // Those caused the content to expand beyond the scroll container, blocking all scroll
  // Now using a simple centered flex layout that stays within normal flow
  return (
    <>
      <div className="flex flex-col items-center justify-center py-20 px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            {salesExceeded ? '🚫 মাসিক বিক্রির সীমা পূর্ণ' : '🔒 সাবস্ক্রিপশন প্রয়োজন'}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">{reason}</p>
          <button
            onClick={() => navigate('/subscription')}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-all"
          >
            সাবস্ক্রিপশন নিন
          </button>
          <button
            onClick={() => navigate('/credit-book')}
            className="w-full mt-2 px-6 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/70 inline-flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4" /> বাকির খাতা দেখুন
          </button>
          <p className="text-xs text-muted-foreground mt-3">আপনার সব তথ্য সুরক্ষিত আছে ✅</p>
        </div>
      </div>
    </>
  );
}
