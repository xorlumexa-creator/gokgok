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
    // FIX: Use h-screen + overflow-hidden on outer, overflow-y-auto on inner
    // Previously min-h-screen with no height constraint = page couldn't scroll
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* FIX: This inner div must be scrollable, not the whole page */}
      <div className="flex-1 flex flex-col h-full overflow-hidden lg:ml-0">
        <Header onMenuClick={() => setSidebarOpen(true)} title={title} />

        {/* FIX: main gets overflow-y-auto so content scrolls inside it */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
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
