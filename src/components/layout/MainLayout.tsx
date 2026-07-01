import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SubscriptionLock } from './SubscriptionLock';
import TrialWarningBanner from '@/components/TrialWarningBanner';
import { SafetyNotice } from '@/components/SafetyNotice';
import { ensureNotificationPermission, runScheduledChecks, maybeShowDailyReminder } from '@/lib/notifications';

interface MainLayoutProps {
  title?: string;
}

export function MainLayout({ title }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureNotificationPermission();
      if (cancelled) return;
      void runScheduledChecks();
      maybeShowDailyReminder();
    })();
    const i = setInterval(() => {
      void runScheduledChecks();
      maybeShowDailyReminder();
    }, 30 * 60 * 1000);
    return () => { cancelled = true; clearInterval(i); };
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <Header onMenuClick={() => setSidebarOpen(true)} title={title} />

        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-10">
          <SubscriptionLock>
            <TrialWarningBanner />
            <Outlet />
            <div className="mt-6">
              <SafetyNotice />
            </div>
          </SubscriptionLock>
        </main>
      </div>
    </div>
  );
}
