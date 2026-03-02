import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] bg-amber-500 text-white text-center py-1.5 text-xs font-medium">
      You're offline — showing cached events
    </div>
  );
}
