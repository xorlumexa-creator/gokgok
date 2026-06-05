import { registerSW } from 'virtual:pwa-register';

function isBlockedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  if (new URLSearchParams(window.location.search).get('sw') === 'off') return true;
  try { if (window.self !== window.top) return true; } catch { return true; }

  const host = window.location.hostname;
  return host.startsWith('id-preview--')
    || host.startsWith('preview--')
    || host === 'lovableproject.com'
    || host.endsWith('.lovableproject.com')
    || host === 'lovableproject-dev.com'
    || host.endsWith('.lovableproject-dev.com')
    || host === 'beta.lovable.dev'
    || host.endsWith('.beta.lovable.dev');
}

async function unregisterAppWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    regs
      .filter((reg) => new URL(reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || '', window.location.origin).pathname === '/sw.js')
      .map((reg) => reg.unregister()),
  );
}

export function registerAppServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  if (isBlockedContext()) {
    void unregisterAppWorker();
    return;
  }

  registerSW({
    immediate: true,
    onNeedRefresh() {
      window.location.reload();
    },
  });
}