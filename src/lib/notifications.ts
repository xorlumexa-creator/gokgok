// Dukan 360 — Local notifications (Web Notification API, works inside the
// Web2APK Android wrapper because it's the same Chromium runtime).

import { getAll } from './idb';

const DAILY_FLAG = 'notif:dailyReminderShown';

function canNotify(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!canNotify()) return 'denied';
  if (Notification.permission === 'default') {
    try { return await Notification.requestPermission(); } catch { return 'denied'; }
  }
  return Notification.permission;
}

function notify(title: string, body: string, tag: string): void {
  if (!canNotify() || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' });
  } catch { /* some browsers block constructor; ignore */ }
}

// ---------- checks --------------------------------------------------------

interface ProductRow {
  id: string;
  name: string;
  stock: number;
  restockThreshold?: number;
  expiryDate?: string;
}

const LOW_STOCK_TAG_PREFIX = 'lowstock:';
const EXPIRY_TAG_PREFIX = 'expiry:';

const LAST_CHECK_KEY = 'notif:lastCheckAt';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function runScheduledChecks(force = false): Promise<void> {
  if (!canNotify() || Notification.permission !== 'granted') return;

  const last = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
  if (!force && Date.now() - last < 6 * 60 * 60 * 1000) return; // throttle 6h

  let products: ProductRow[];
  try {
    products = await getAll('products');
  } catch (e) {
    console.warn('[notifications] skipped — could not read products', e);
    return;
  }

  // Low stock
  for (const p of products) {
    const threshold = p.restockThreshold ?? 5;
    if (p.stock <= threshold && p.stock >= 0) {
      notify(
        '⚠️ স্টক কম',
        `${p.name} এর স্টক কমে এসেছে (${p.stock} বাকি)`,
        `${LOW_STOCK_TAG_PREFIX}${p.id}`,
      );
    }
  }

  // Expiry within 7 days
  const now = Date.now();
  for (const p of products) {
    if (!p.expiryDate) continue;
    const exp = new Date(p.expiryDate).getTime();
    if (Number.isNaN(exp)) continue;
    const daysLeft = Math.ceil((exp - now) / ONE_DAY_MS);
    if (daysLeft <= 7 && daysLeft >= 0) {
      notify(
        '🕒 মেয়াদ শেষ হচ্ছে',
        `${p.name} এর মেয়াদ শেষ হবে ${daysLeft} দিনে`,
        `${EXPIRY_TAG_PREFIX}${p.id}`,
      );
    }
  }

  localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
}

export function maybeShowDailyReminder(): void {
  if (!canNotify() || Notification.permission !== 'granted') return;
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(DAILY_FLAG) === today) return;
  const hour = new Date().getHours();
  if (hour < 18) return; // only after 6 PM
  notify(
    'আজকের সারাংশ দেখুন',
    'আজকের বিক্রি ও বাকি একবার চেক করে নিন',
    `daily:${today}`,
  );
  localStorage.setItem(DAILY_FLAG, today);
}
