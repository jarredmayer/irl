import { useNavigate } from 'react-router-dom';
import { formatEventDate, formatEventTime } from '../../utils/time';
import { CATEGORY_COLORS } from '../../constants';
import type { ScoredEvent, FollowType } from '../../types';

interface WildCardSectionProps {
  event: ScoredEvent;
  isSaved?: boolean;
  onSave?: (eventId: string) => void;
  onFollow?: (id: string, type: FollowType, name: string) => void;
  isFollowingVenue?: boolean;
  isFollowingSeries?: boolean;
  isFollowingNeighborhood?: boolean;
  wildCardLabel?: string;
}

export function WildCardSection({
  event,
  isSaved = false,
  onSave,
  wildCardLabel,
}: WildCardSectionProps) {
  const navigate = useNavigate();
  const cat = CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS['Other'];

  // Use provided label or fallback
  const contextLine = wildCardLabel || "Under the radar.";

  const handleClick = () => {
    navigate(`/event/${event.id}`);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ('vibrate' in navigator) navigator.vibrate(10);
    onSave?.(event.id);
  };

  return (
    <section className="px-4 py-6">
      {/* Section label */}
      <p className="text-xs font-bold tracking-[0.15em] uppercase text-ink-3 mb-3">
        THE WILD CARD
      </p>

      {/* Card */}
      <div
        onClick={handleClick}
        className="bg-white rounded-[22px] overflow-hidden card-shadow cursor-pointer transition-transform active:scale-[0.98]"
      >
        {/* Image if available */}
        {event.image && (
          <div className="relative aspect-[16/10]">
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            {/* Save button on image */}
            <button
              onClick={handleSave}
              className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${
                isSaved
                  ? 'bg-rose-500 text-white'
                  : 'bg-white/20 text-white backdrop-blur-sm hover:bg-white/30'
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {/* Wild card label - italic Bodoni */}
          <p className="font-serif text-sm italic text-ink-2 mb-2">
            {contextLine}
          </p>

          {/* Category swatch + label */}
          <div className="flex items-center gap-1.5 mb-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: cat.accent }}
            />
            <span className="text-xs font-medium text-ink-2 uppercase tracking-wide">
              {event.category}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-serif text-[19px] text-ink leading-tight mb-2">
            {event.title}
          </h3>

          {/* Short why */}
          <p className="text-sm text-ink-2 leading-relaxed mb-3 line-clamp-2">
            {event.shortWhy}
          </p>

          {/* Date/time row */}
          <div className="flex items-center gap-3 text-sm text-ink-3">
            <span>{formatEventDate(event.startAt, event.timezone)}</span>
            <span>·</span>
            <span>{formatEventTime(event.startAt, event.timezone)}</span>
            {event.neighborhood && (
              <>
                <span>·</span>
                <span>{event.neighborhood}</span>
              </>
            )}
          </div>
        </div>

        {/* Save button if no image */}
        {!event.image && (
          <div className="px-4 pb-4">
            <button
              onClick={handleSave}
              className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors btn-press ${
                isSaved
                  ? 'bg-rose-50 text-rose-500'
                  : 'bg-soft text-ink-2 hover:bg-[var(--color-divider)]'
              }`}
            >
              {isSaved ? 'Saved' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
