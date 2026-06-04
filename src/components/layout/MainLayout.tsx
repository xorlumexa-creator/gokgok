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

  // Local notifications: ask permission once, then run scheduled checks
  // on mount and every 30 minutes while the app is open.
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

      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <Header onMenuClick={() => setSidebarOpen(true)} title={title} />

        <main className="flex-1 p-4 md:p-6 overflow-auto">
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
