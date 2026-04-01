import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import logoImg from '@/assets/logo.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissCount, setDismissCount] = useState(0);

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  useEffect(() => {
    if (isStandalone) return;

    const count = parseInt(localStorage.getItem('installDismissCount') || '0', 10);
    setDismissCount(count);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (count < 3) setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isStandalone]);

  if (isStandalone || !showBanner || dismissCount >= 3) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    const newCount = dismissCount + 1;
    setDismissCount(newCount);
    localStorage.setItem('installDismissCount', newCount.toString());
    setShowBanner(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9998] animate-slide-up">
      <div className="bg-card border border-border rounded-2xl shadow-lg p-4 flex items-center gap-3 max-w-md mx-auto">
        <img src={logoImg} alt="Dukan 360°" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm">Dukan 360° ইনস্টল করুন</p>
          <p className="text-xs text-muted-foreground">হোম স্ক্রিনে যোগ করে দ্রুত ব্যবহার করুন</p>
        </div>
        <button
          onClick={handleInstall}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium flex-shrink-0 flex items-center gap-1"
        >
          <Download className="w-4 h-4" />
          Install
        </button>
        <button onClick={handleDismiss} className="p-1 text-muted-foreground hover:text-foreground flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
