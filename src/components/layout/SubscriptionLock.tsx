import { Lock, BookOpen, Eye, AlertTriangle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useSubscription, toBn } from '@/context/SubscriptionContext';

// When locked, only these two pages stay reachable — and even they are
// rendered READ-ONLY (see ViewOnly below), so a shopkeeper can always see
// who owes them money / their own account records, but can't add, edit,
// or delete anything until they pay.
const VIEW_ONLY_ALLOWED = ['/personal-accounts', '/credit-book'];

const DELETION_WARNING =
  'সাবস্ক্রিপশন পরিশোধ না করা পর্যন্ত এই পেজ শুধু দেখার জন্য উন্মুক্ত — কোনো বাটন কাজ করবে না। ' +
  '৬০ দিনের মধ্যে সাবস্ক্রিপশন না নিলে আপনার অ্যাকাউন্ট, বাকির খাতা ও ব্যক্তিগত হিসাবের সব তথ্য স্থায়ীভাবে মুছে ফেলা হবে। ' +
  'তাই এই তথ্যের স্ক্রিনশট / ছবি তুলে রাখুন, অথবা এখনই সাবস্ক্রিপশন কিনুন।';

// Renders `children` in a strictly non-interactive state: buttons, links,
// inputs and any other control inside are unclickable/unfocusable, while
// the data itself stays fully visible and the page still scrolls normally.
// `inert` is the correct primitive for this (unlike pointer-events:none,
// it doesn't fight touch-scroll on Android WebView) — it's just not in
// React 18's TS types yet, hence the `as any` cast.
function ViewOnly({ children }: { children: React.ReactNode }) {
  const inertProps = { inert: '' } as any;
  return (
    <div className="relative">
      <div className="sticky top-0 z-20 mb-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>{DELETION_WARNING}</p>
      </div>
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        <Eye className="w-3.5 h-3.5" /> শুধু দেখার মোড (View only)
      </div>
      <div {...inertProps} className="select-text opacity-95">
        {children}
      </div>
    </div>
  );
}

export function SubscriptionLock({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();
  const { isLocked, creditExhausted, salesCreditUsed, salesCreditLimit } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  if (!profile) return <>{children}</>;
  if (profile.role === 'manager') return <>{children}</>;

  const locked = isLocked || creditExhausted;
  if (!locked) return <>{children}</>;

  // Full lockout (trial/subscription expired) restricts to the two
  // view-only pages. A merely credit-exhausted (but still subscribed)
  // account keeps full normal access — that limit isn't a payment block.
  if (isLocked && VIEW_ONLY_ALLOWED.includes(location.pathname)) {
    return <ViewOnly>{children}</ViewOnly>;
  }

  const reason = creditExhausted
    ? `এই চক্রের ${toBn(salesCreditLimit.toLocaleString())} টি বিক্রি+বাকি-আপডেটের সীমা পূর্ণ হয়েছে। ব্যবসা চালিয়ে যেতে প্ল্যান নবায়ন করুন।`
    : 'আপনার ট্রায়াল/সাবস্ক্রিপশন শেষ। ব্যবসা চালিয়ে যেতে সাবস্ক্রিপশন নিন।';

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {creditExhausted ? '🚫 এই চক্রের সীমা পূর্ণ' : '🔒 সাবস্ক্রিপশন প্রয়োজন'}
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">{reason}</p>
        {isLocked && (
          <p className="text-xs text-amber-700 dark:text-amber-400 mb-4 bg-amber-50 dark:bg-amber-950 rounded-lg p-2.5">
            {DELETION_WARNING}
          </p>
        )}
        <button
          onClick={() => navigate('/subscription')}
          className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-all"
        >
          সাবস্ক্রিপশন নিন
        </button>
        {isLocked && (
          <button
            onClick={() => navigate('/credit-book')}
            className="w-full mt-2 px-6 py-3 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/70 inline-flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4" /> বাকির খাতা দেখুন (শুধু দেখার জন্য)
          </button>
        )}
        <p className="text-xs text-muted-foreground mt-3">আপনার সব তথ্য সুরক্ষিত আছে ✅</p>
      </div>
    </div>
  );
}
