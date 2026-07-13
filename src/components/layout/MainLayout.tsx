import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SubscriptionLock } from './SubscriptionLock';
import TrialWarningBanner from '@/components/TrialWarningBanner';
import { SafetyNotice } from '@/components/SafetyNotice';
import { ensureNotificationPermission, runScheduledChecks, maybeShowDailyReminder } from '@/lib/notifications';
import { useAndroidBackButton } from '@/hooks/useAndroidBackButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MainLayoutProps {
  title?: string;
}

export function MainLayout({ title }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { showExitConfirm, confirmExit, cancelExit } = useAndroidBackButton();

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

      <AlertDialog open={showExitConfirm} onOpenChange={(open) => { if (!open) cancelExit(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Dukan 360?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to exit the app?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelExit}>No</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
