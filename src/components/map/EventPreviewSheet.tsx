import { useNavigate } from 'react-router-dom';
import { formatEventDate, formatEventTime } from '../../utils/time';
import { formatDistance } from '../../utils/distance';
import { Chip } from '../ui/Chip';
import type { ScoredEvent } from '../../types';

interface EventPreviewSheetProps {
  event: ScoredEvent | null;
  isSaved: boolean;
  onSaveToggle: (eventId: string) => void;
  onClose: () => void;
}

export function EventPreviewSheet({
  event,
  isSaved,
  onSaveToggle,
  onClose,
}: EventPreviewSheetProps) {
  const navigate = useNavigate();

  if (!event) {
    return null;
  }

  const handleViewDetails = () => {
    navigate(`/event/${event.id}`);
  };

  return (
    <div className="fixed bottom-16 left-0 right-0 z-[2000] px-4 pb-4 pointer-events-none">
      <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden pointer-events-auto animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-2">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
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

            {/* Save button */}
            <button
              onClick={() => onSaveToggle(event.id)}
              className={`flex-shrink-0 p-2 rounded-full transition-colors ${
                isSaved
                  ? 'text-sky-500 bg-sky-50'
                  : 'text-slate-400 hover:bg-slate-100'
              }`}
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill={isSaved ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
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
          <div className="flex gap-2">
            <button
              onClick={handleViewDetails}
              className="flex-1 py-2.5 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors"
            >
              View details
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
