import { Lock } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { useNavigate } from 'react-router-dom';

export function SubscriptionLock({ children }: { children: React.ReactNode }) {
  const { storeInfo } = useStore();
  const navigate = useNavigate();

  if (!storeInfo) return <>{children}</>;

  const trialStart = new Date(storeInfo.trialStartDate);
  const now = new Date();
  const daysSinceTrial = Math.floor((now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24));
  const isLocked = daysSinceTrial > 14;

  if (!isLocked) return <>{children}</>;

  return (
    <div className="relative min-h-[60vh]">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center rounded-xl">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">ট্রায়াল শেষ হয়ে গেছে</h2>
          <p className="text-muted-foreground mb-4">
            ১৪ দিনের ফ্রি ট্রায়াল শেষ। সাবস্ক্রিপশন নিন।
          </p>
          <button
            onClick={() => navigate('/subscription')}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all"
          >
            সাবস্ক্রিপশন নিন
          </button>
          <p className="text-xs text-muted-foreground mt-3">আপনার সব তথ্য সুরক্ষিত আছে</p>
        </div>
      </div>
      <div className="opacity-20 pointer-events-none">
        {children}
      </div>
    </div>
  );
}