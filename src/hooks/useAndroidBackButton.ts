import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Route that the hardware back button should always land on before it's
// allowed to exit the app. Keep this in sync with the dashboard route in
// src/App.tsx.
const DASHBOARD_PATH = '/dashboard';

/**
 * Intercepts the Android hardware/gesture back button so it never abruptly
 * kills the app:
 *  - From any screen other than the dashboard -> navigate to the dashboard.
 *  - From the dashboard itself -> show an "exit app?" confirmation instead
 *    of exiting immediately.
 *
 * No-ops on web/PWA (no @capacitor/app, or not running in a native shell) so
 * normal browser back-navigation is left untouched there.
 */
export function useAndroidBackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // The backButton listener is registered once; read the *current* path via
  // a ref instead of re-subscribing on every navigation.
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
    if (!isNative) return;

    let cancelled = false;
    let removeListener: (() => void) | undefined;

    import('@capacitor/app')
      .then(({ App }) => {
        if (cancelled) return;
        App.addListener('backButton', () => {
          if (pathRef.current === DASHBOARD_PATH) {
            setShowExitConfirm(true);
          } else {
            navigate(DASHBOARD_PATH);
          }
        }).then((handle) => {
          if (cancelled) {
            handle.remove();
            return;
          }
          removeListener = () => handle.remove();
        });
      })
      .catch(() => {
        // @capacitor/app isn't available (e.g. web build) — fall back to
        // default platform behavior.
      });

    return () => {
      cancelled = true;
      removeListener?.();
    };
    // navigate is stable from react-router; intentionally not re-running
    // this effect on every route change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmExit = useCallback(() => {
    setShowExitConfirm(false);
    import('@capacitor/app')
      .then(({ App }) => App.exitApp())
      .catch(() => {
        // Not running natively — nothing to exit.
      });
  }, []);

  const cancelExit = useCallback(() => {
    setShowExitConfirm(false);
  }, []);

  return { showExitConfirm, confirmExit, cancelExit };
}
