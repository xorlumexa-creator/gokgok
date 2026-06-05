import { Lock, BookOpen } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription, SALES_CREDIT_LIMIT } from '@/context/SubscriptionContext';

const TRIAL_DAYS = 3;

// Routes that stay accessible even when locked (baki page must be viewable)
const ALWAYS_ALLOWED = ['/credit-book', '/profile', '/notifications'];

export function SubscriptionLock({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();
  const { salesCreditUsed } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  if (!profile) return <>{children}</>;
  if (profile.role === 'manager') return <>{children}</>;

  // Active paid plan?
  const planActive = profile.subscription_status === 'active'
    && profile.plan_expiry
    && new Date(profile.plan_expiry).getTime() > Date.now();

  // Temp access window (2 days after payment submitted)
  const tempActive = profile.temporary_access
    && profile.temporary_expiry
    && new Date(profile.temporary_expiry).getTime() > Date.now();

  // Trial window
  const trialStart = new Date(profile.trial_start_date || (profile as any).created_at || Date.now());
  const trialDaysLeft = Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - trialStart.getTime()) / 86400000));
  const trialActive = trialDaysLeft > 0;

  const salesExceeded = salesCreditUsed >= SALES_CREDIT_LIMIT;

  // Lock if no active plan/trial/temp, OR if monthly sales limit exceeded
  const needsSubscription = !planActive && !tempActive && !trialActive;
  const isLocked = needsSubscription || salesExceeded;

  if (!isLocked) return <>{children}</>;

  // Allow baki page always — but show banner
  if (ALWAYS_ALLOWED.includes(location.pathname)) return <>{children}</>;

  const reason = salesExceeded
    ? 'এই মাসের ১২,০০০ বিক্রির সীমা পূর্ণ হয়েছে। ব্যবসা চালিয়ে যেতে প্ল্যান নবায়ন করুন।'
    : 'আপনার ট্রায়াল/সাবস্ক্রিপশন শেষ। সাবস্ক্রিপশন নিন।';

  return (
    <div className="relative min-h-[60vh]">
      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-40 flex flex-col items-center justify-center rounded-xl p-6">
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
      <div className="opacity-20 pointer-events-none">
        {children}
      </div>
    </div>
  );
}
