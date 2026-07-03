import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-black text-center text-sm font-medium py-1.5 px-3 shadow"
    >
      You're offline — showing saved data.
    </div>
  );
}
