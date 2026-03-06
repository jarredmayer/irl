import { useNavigate } from 'react-router-dom';
import { formatEventTime, getRelativeTimeLabel } from '../../utils/time';
import type { ScoredEvent } from '../../types';

interface NudgeSectionProps {
  event: ScoredEvent;
  isSaved?: boolean;
  onSave?: (eventId: string) => void;
}

// Amber/mustard accent color
const AMBER = '#C4A040';

export function NudgeSection({ event, isSaved = false, onSave }: NudgeSectionProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/event/${event.id}`);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ('vibrate' in navigator) navigator.vibrate(10);
    onSave?.(event.id);
  };

  const timeLabel = getRelativeTimeLabel(event.startAt);

  return (
    <section className="px-4 py-6">
      {/* Section label */}
      <p className="text-xs font-bold tracking-[0.15em] uppercase text-ink-3 mb-3">
        THE NUDGE
      </p>

      {/* Compact card with amber left border */}
      <div
        onClick={handleClick}
        className="bg-white rounded-[16px] overflow-hidden card-shadow cursor-pointer transition-transform active:scale-[0.98] flex"
        style={{ borderLeft: `4px solid ${AMBER}` }}
      >
        <div className="flex-1 p-4">
          {/* Happening Soon label */}
          <div className="flex items-center gap-1.5 mb-2">
            <span style={{ color: AMBER }}>◆</span>
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: AMBER }}
            >
              Happening Soon
            </span>
          </div>

          {/* Title */}
          <h3 className="font-serif text-lg font-semibold text-ink leading-tight mb-1">
            {event.title}
          </h3>

          {/* Venue + time */}
          <div className="flex items-center gap-2 text-sm text-ink-2">
            {event.venueName && (
              <>
                <span>{event.venueName}</span>
                <span className="text-ink-3">·</span>
              </>
            )}
            <span>{formatEventTime(event.startAt, event.timezone)}</span>
            <span className="text-ink-3">·</span>
            <span className="font-medium" style={{ color: AMBER }}>{timeLabel}</span>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center pr-4">
          <button
            onClick={handleSave}
            className={`p-2 rounded-full transition-colors ${
              isSaved
                ? 'bg-rose-50 text-rose-500'
                : 'bg-soft text-ink-3 hover:text-ink-2'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
