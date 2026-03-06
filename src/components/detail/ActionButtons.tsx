import { useState, useRef, useEffect } from 'react';
import { downloadICS, getGoogleCalendarUrl } from '../../services/calendar';
import { openDirections } from '../../utils/directions';
import { useSavedEvents } from '../../hooks/useSavedEvents';
import type { Event } from '../../types';

interface ActionButtonsProps {
  event: Event;
}

export function ActionButtons({ event }: ActionButtonsProps) {
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isSaved, toggleSaved } = useSavedEvents();
  const saved = isSaved(event.id);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowCalendarMenu(false);
      }
    }
    if (showCalendarMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCalendarMenu]);

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

  const handleSave = () => {
    if ('vibrate' in navigator) navigator.vibrate(10);
    toggleSaved(event.id);
  };

  return (
    <div className="flex gap-2">
      {/* Save button */}
      <ActionButton
        icon={
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        }
        label={saved ? 'Saved' : 'Save'}
        onClick={handleSave}
        active={saved}
      />

      {/* Calendar dropdown */}
      <div className="relative flex-1" ref={menuRef}>
        <ActionButton
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          }
          label="Add to Cal"
          onClick={() => setShowCalendarMenu(!showCalendarMenu)}
          hasDropdown
        />

        {/* Calendar options dropdown */}
        {showCalendarMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl card-shadow border border-divider overflow-hidden z-10">
            <button
              onClick={() => {
                downloadICS(event);
                setShowCalendarMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-soft transition-colors"
            >
              <svg className="w-5 h-5 text-ink-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              <div>
                <p className="text-sm font-medium text-ink">Download .ics</p>
                <p className="text-xs text-ink-3">Apple Calendar, Outlook</p>
              </div>
            </button>

            <div className="h-px bg-divider" />

            <a
              href={getGoogleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowCalendarMenu(false)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-soft transition-colors"
            >
              <svg className="w-5 h-5 text-ink-3" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <div>
                <p className="text-sm font-medium text-ink">Google Calendar</p>
                <p className="text-xs text-ink-3">Opens in new tab</p>
              </div>
            </a>
          </div>
        )}
      </div>

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
          className="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-ink text-white hover:opacity-90 transition-opacity btn-press"
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
  active?: boolean;
  hasDropdown?: boolean;
}

function ActionButton({ icon, label, onClick, active = false, hasDropdown = false }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-colors btn-press ${
        active
          ? 'bg-rose-50 text-rose-500'
          : 'bg-soft text-ink-2 hover:bg-[var(--color-divider)]'
      }`}
    >
      <div className="relative">
        {icon}
        {hasDropdown && (
          <svg className="absolute -right-1.5 -bottom-1 w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5H7z" />
          </svg>
        )}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
