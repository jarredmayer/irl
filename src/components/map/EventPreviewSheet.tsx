import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { formatEventDate, formatEventTime } from '../../utils/time';
import { formatDistance } from '../../utils/distance';
import { Chip } from '../ui/Chip';
import type { ScoredEvent } from '../../types';

interface EventPreviewSheetProps {
  event: ScoredEvent | null;
  onClose: () => void;
}

export function EventPreviewSheet({
  event,
  onClose,
}: EventPreviewSheetProps) {
  const navigate = useNavigate();

  if (!event) {
    return null;
  }

  const handleViewDetails = () => {
    navigate(`/event/${event.id}`);
  };

  // Use portal to render outside of map's stacking context
  return createPortal(
    <div
      className="fixed bottom-16 left-0 right-0 px-4 pb-4 pointer-events-none"
      style={{ zIndex: 9999 }}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden pointer-events-auto animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-2">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span className="font-medium text-sky-600">
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
              <h3 className="font-semibold text-slate-900 line-clamp-1">
                {event.editorPick && (
                  <span className="inline-block w-2 h-2 bg-amber-400 rounded-full mr-1.5 align-middle" />
                )}
                {event.title}
              </h3>
              <p className="text-sm text-slate-500 line-clamp-1">
                {event.venueName || event.neighborhood}
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Short why */}
          <p className="text-sm text-slate-600 line-clamp-2 mb-3">
            {event.shortWhy}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {event.priceLabel && <Chip label={event.priceLabel} size="sm" />}
            {event.isOutdoor && <Chip label="Outdoor" size="sm" />}
            {event.tags.slice(0, 2).map((tag) => (
              <Chip key={tag} label={tag.replace(/-/g, ' ')} size="sm" />
            ))}
          </div>

          {/* Actions */}
          <button
            onClick={handleViewDetails}
            className="w-full py-3 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition-colors"
          >
            View details
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
