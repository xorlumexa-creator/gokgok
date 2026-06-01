import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SubscriptionLock } from './SubscriptionLock';
import TrialWarningBanner from '@/components/TrialWarningBanner';

interface MainLayoutProps {
  title?: string;
}

export function MainLayout({ title }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <Header onMenuClick={() => setSidebarOpen(true)} title={title} />

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <SubscriptionLock>
            <TrialWarningBanner />
            <Outlet />
          </SubscriptionLock>
        </main>
      </div>
    </div>
  );
}
