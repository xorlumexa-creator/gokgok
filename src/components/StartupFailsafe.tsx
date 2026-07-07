import { Component, ErrorInfo, createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { STARTUP_FAILSAFE_MS, reloadApp } from '@/lib/asyncTimeout';

interface StartupFailsafeValue {
  forceRender: boolean;
  showReload: boolean;
}

const StartupFailsafeContext = createContext<StartupFailsafeValue>({
  forceRender: false,
  showReload: false,
});

export function StartupFailsafeProvider({ children }: { children: ReactNode }) {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setExpired(true), STARTUP_FAILSAFE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const value = useMemo(
    () => ({ forceRender: expired, showReload: expired }),
    [expired],
  );

  return (
    <StartupFailsafeContext.Provider value={value}>
      {children}
    </StartupFailsafeContext.Provider>
  );
}

export function useStartupFailsafe() {
  return useContext(StartupFailsafeContext);
}

export function LoadingEscape({ compact = false }: { compact?: boolean }) {
  const { showReload } = useStartupFailsafe();
  if (!showReload) return null;

  return (
    <div className={compact ? 'mt-4 text-center' : 'mt-6 text-center max-w-xs'}>
      <p className="text-sm text-muted-foreground mb-3">
        Offline — showing limited data. If this screen stays here, reload the app.
      </p>
      <button
        type="button"
        onClick={reloadApp}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent"
      >
        <RefreshCw className="h-4 w-4" />
        Reload app
      </button>
    </div>
  );
}

export function OfflineRouteFallback() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
      <div className="max-w-sm space-y-3">
        <h1 className="text-xl font-bold text-foreground">Offline — showing limited data</h1>
        <p className="text-sm text-muted-foreground">
          This screen could not fully load from saved app files. Reload when internet is available.
        </p>
        <button
          type="button"
          onClick={reloadApp}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent"
        >
          <RefreshCw className="h-4 w-4" />
          Reload app
        </button>
      </div>
    </main>
  );
}

export class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[route] render/chunk failed:', error, info.componentStack);
  }

  render() {
    if (this.state.failed) return <OfflineRouteFallback />;
    return this.props.children;
  }
}
