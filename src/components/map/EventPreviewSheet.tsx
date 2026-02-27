import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { formatEventDate, formatEventTime } from '../../utils/time';
import { formatDistance } from '../../utils/distance';
import { CATEGORY_COLORS } from '../../constants';
import { useSavedEvents } from '../../hooks/useSavedEvents';
import type { ScoredEvent } from '../../types';

interface EventPreviewSheetProps {
  event: ScoredEvent | null;
  onClose: () => void;
}

export function EventPreviewSheet({ event, onClose }: EventPreviewSheetProps) {
  const navigate = useNavigate();
  const { isSaved, toggleSaved } = useSavedEvents();

  if (!event) return null;

  const cat = CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS['Other'];
  const catColor = cat.primary;
  const catEmoji = cat.emoji;
  const saved = isSaved(event.id);

  const handleViewDetails = () => navigate(`/event/${event.id}`);

  const hasImage = Boolean(event.image);

  return createPortal(
    <div
      className="fixed bottom-16 left-0 right-0 px-3 pb-3 pointer-events-none"
      style={{ zIndex: 9999 }}
    >
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto animate-slide-up"
           style={{ boxShadow: '0 -2px 40px rgba(0,0,0,0.18), 0 8px 32px rgba(0,0,0,0.14)' }}>

        {hasImage ? (
          /* ── Image hero layout ── */
          <div className="relative" style={{ height: '152px' }}>
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            {/* Gradient scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

            {/* Category badge */}
            <div className="absolute top-3 left-3">
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs font-semibold"
                style={{ background: catColor + 'cc' }}
              >
                <span>{catEmoji}</span>
                <span>{event.category}</span>
              </div>
            </div>

            {/* Editor pick badge */}
            {event.editorPick && (
              <div className="absolute top-3 left-3 mt-6">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/90 text-white text-xs font-bold">
                  <span>⭐</span>
                  <span>Editor&apos;s Pick</span>
                </div>
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:text-white transition-colors"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Title on image */}
            <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
              <div className="flex items-center gap-1.5 text-white/70 text-xs mb-1">
                <span className="font-semibold text-white/90">
                  {formatEventDate(event.startAt, event.timezone)}
                </span>
                <span>·</span>
                <span>{formatEventTime(event.startAt, event.timezone)}</span>
                {event.distanceMiles !== undefined && (
                  <>
                    <span>·</span>
                    <span>{formatDistance(event.distanceMiles)}</span>
                  </>
                )}
              </div>
              <h3 className="font-bold text-white text-[15px] leading-tight line-clamp-1">
                {event.title}
              </h3>
              {(event.venueName || event.neighborhood) && (
                <p className="text-white/65 text-xs mt-0.5 line-clamp-1">
                  {event.venueName || event.neighborhood}
                </p>
              )}
            </div>
          </div>
        ) : (
          /* ── No-image layout: colour accent bar + header ── */
          <>
            <div style={{ height: '3px', background: `linear-gradient(90deg, ${catColor}, ${cat.secondary})` }} />
            <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-base leading-none">{catEmoji}</span>
                  <span className="text-xs font-medium text-slate-500">{event.category}</span>
                  {event.editorPick && (
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Pick</span>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-[15px] leading-tight line-clamp-1">
                  {event.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {event.venueName || event.neighborhood}
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 transition-colors -mt-0.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </>
        )}

        {/* ── Body ── */}
        <div className="px-4 pt-3 pb-4">
          {/* Time/distance row (only shown here when no image) */}
          {!hasImage && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
              <span className="font-semibold" style={{ color: catColor }}>
                {formatEventDate(event.startAt, event.timezone)}
              </span>
              <span>·</span>
              <span>{formatEventTime(event.startAt, event.timezone)}</span>
              {event.distanceMiles !== undefined && (
                <>
                  <span>·</span>
                  <span>{formatDistance(event.distanceMiles)}</span>
                </>
              )}
            </div>
          )}

          {/* Short why */}
          <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 mb-3">
            {event.shortWhy}
          </p>

          {/* Tags row */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {event.priceLabel && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                {event.priceLabel}
              </span>
            )}
            {event.isOutdoor && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                🌿 Outdoor
              </span>
            )}
            {event.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: catColor + '18', color: catColor }}
              >
                {tag.replace(/-/g, ' ')}
              </span>
            ))}
          </div>

          {/* CTA row */}
          <div className="flex items-center gap-2">
            {/* Heart / save button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if ('vibrate' in navigator) navigator.vibrate(10);
                toggleSaved(event.id);
              }}
              className={`flex-shrink-0 p-2.5 rounded-xl transition-all btn-press ${
                saved
                  ? 'bg-rose-50 text-rose-500'
                  : 'bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-400'
              }`}
              aria-label={saved ? 'Unsave event' : 'Save event'}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>

            {/* Ticket link */}
            {event.ticketUrl && (
              <a
                href={event.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 px-3 py-2.5 rounded-xl text-sm font-semibold bg-sky-500 text-white hover:bg-sky-600 active:opacity-80 transition-colors"
              >
                Tickets
              </a>
            )}

            {/* View details */}
            <button
              onClick={handleViewDetails}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity active:opacity-80"
              style={{ background: `linear-gradient(135deg, ${catColor}, ${cat.secondary})` }}
            >
              View details →
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
