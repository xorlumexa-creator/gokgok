// Centralized connectivity detection.
//
// navigator.onLine / window 'online'|'offline' events are unreliable inside
// Android WebViews — including Capacitor's — and very often report `true`
// regardless of actual connectivity. That silently broke every offline code
// path in this app: the offline banner never showed in the APK, the sync
// engine kept trying to sync instead of backing off, and cachedFetch's
// offline fallback never triggered — because the app genuinely believed it
// was always online.
//
// Fix: when running inside the native Capacitor app, ask the OS directly via
// @capacitor/network instead of trusting the WebView's own reporting. On the
// web/PWA, browser events are reliable, so we keep using those there.

let cachedOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
const listeners = new Set<(online: boolean) => void>();

function notify(online: boolean) {
  if (cachedOnline === online) return;
  cachedOnline = online;
  listeners.forEach((cb) => cb(online));
}

function setupWebListeners() {
  window.addEventListener('online', () => notify(true));
  window.addEventListener('offline', () => notify(false));
}

function setup() {
  if (typeof window === 'undefined') return;

  const isNative = !!(window as any).Capacitor?.isNativePlatform?.();

  if (!isNative) {
    setupWebListeners();
    return;
  }

  import('@capacitor/network')
    .then(({ Network }) => {
      Network.getStatus().then((status) => notify(status.connected));
      Network.addListener('networkStatusChange', (status) => notify(status.connected));
    })
    .catch(() => {
      // If the native plugin somehow isn't available, fall back rather
      // than leaving connectivity detection silently broken.
      setupWebListeners();
    });
}

setup();

/** Best-effort synchronous connectivity check. Use in place of navigator.onLine. */
export function isOnline(): boolean {
  return cachedOnline;
}

/** Subscribe to connectivity changes. Returns an unsubscribe function. */
export function subscribeOnlineStatus(cb: (online: boolean) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
