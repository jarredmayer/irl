import { downloadICS, openGoogleCalendar } from '../../services/calendar';
import { openDirections } from '../../utils/directions';
import type { Event } from '../../types';

interface ActionButtonsProps {
  event: Event;
}

export function ActionButtons({ event }: ActionButtonsProps) {
  const handleShare = async () => {
    const shareData = {
      title: event.title,
      text: event.shortWhy,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(
        `${event.title}\n${event.shortWhy}\n${window.location.href}`
      );
      alert('Link copied to clipboard!');
    }
  };

  const handleCalendar = () => {
    try {
      downloadICS(event);
    } catch {
      openGoogleCalendar(event);
    }
  };

  const handleDirections = () => {
    if (event.lat !== null && event.lng !== null) {
      openDirections({
        lat: event.lat,
        lng: event.lng,
        address: event.address,
        venueName: event.venueName,
      });
    }
  };

  return (
    <div className="flex gap-2">
      <ActionButton
        icon={
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        }
        label="Calendar"
        onClick={handleCalendar}
      />

      {event.lat !== null && event.lng !== null && (
        <ActionButton
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          }
          label="Directions"
          onClick={handleDirections}
        />
      )}

      <ActionButton
        icon={
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
          </svg>
        }
        label="Share"
        onClick={handleShare}
      />

      {event.ticketUrl && (
        <a
          href={event.ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2 2 2 0 012 2 2 2 0 01-2 2v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 01-2-2 2 2 0 012-2V7a2 2 0 00-2-2H5z" />
          </svg>
          <span className="text-xs font-medium">Tickets</span>
        </a>
      )}
    </div>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function ActionButton({ icon, label, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
