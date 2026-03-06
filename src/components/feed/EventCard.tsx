import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatEventTime, getRelativeTimeLabel, isHappeningNow, isNewlyAdded } from '../../utils/time';
import { formatDistance } from '../../utils/distance';
import { getWeatherIcon } from '../../services/weather';
import { Chip } from '../ui/Chip';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { CATEGORY_COLORS } from '../../constants';
import { getCategoryImageByEventId } from '../../data/category-images';
import type { ScoredEvent, HourlyWeather, FollowType } from '../../types';

interface EventCardProps {
  event: ScoredEvent;
  compact?: boolean;
  weather?: HourlyWeather;
  onFollow?: (id: string, type: FollowType, name: string) => void;
  isFollowingVenue?: boolean;
  isFollowingSeries?: boolean;
  isFollowingNeighborhood?: boolean;
  onSave?: (eventId: string) => void;
  onDismiss?: (eventId: string) => void;
  isSaved?: boolean;
  swipeEnabled?: boolean;
}

export function EventCard({
  event,
  compact = false,
  weather,
  onFollow,
  isFollowingVenue = false,
  isFollowingSeries = false,
  isFollowingNeighborhood = false,
  onSave,
  onDismiss,
  isSaved = false,
  swipeEnabled = true,
}: EventCardProps) {
  const navigate = useNavigate();
  const [showFollowMenu, setShowFollowMenu] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showSaveAnimation, setShowSaveAnimation] = useState(false);
  const categoryColor = CATEGORY_COLORS[event.category] || CATEGORY_COLORS['Other'];

  const happeningNow = useMemo(() => isHappeningNow(event.startAt, event.endAt), [event.startAt, event.endAt]);
  const isNew = useMemo(() => isNewlyAdded(event.addedAt), [event.addedAt]);

  const { swipeState, handlers } = useSwipeGesture({
    threshold: 80,
    enabled: swipeEnabled && !compact,
    onSwipeRight: () => {
      if (onSave) {
        setShowSaveAnimation(true);
        onSave(event.id);
        setTimeout(() => setShowSaveAnimation(false), 600);
      }
    },
    onSwipeLeft: () => {
      if (onDismiss) {
        setDismissed(true);
        setTimeout(() => onDismiss(event.id), 300);
      }
    },
  });

  const handleClick = () => {
    if (Math.abs(swipeState.deltaX) < 10) {
      navigate(`/event/${event.id}`);
    }
  };

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFollowMenu(!showFollowMenu);
  };

  const handleFollowOption = (e: React.MouseEvent, type: FollowType, id: string, name: string) => {
    e.stopPropagation();
    onFollow?.(id, type, name);
    setShowFollowMenu(false);
  };

  const hasFollowOptions = event.venueId || event.seriesId || event.neighborhood;
  const isFollowingAny = isFollowingVenue || isFollowingSeries || isFollowingNeighborhood;

  const priceDisplay = event.price !== undefined
    ? event.price === 0 ? 'Free' : `$${event.price}`
    : event.priceLabel;

  // Calculate swipe transform with resistance at edges
  const swipeTransform = swipeState.isSwiping
    ? `translateX(${swipeState.deltaX * 0.6}px)`
    : 'translateX(0)';

  const swipeOpacity = dismissed ? 0 : 1;
  const swipeScale = dismissed ? 0.9 : 1;

  // Get image URL - use event image or category fallback
  const imageUrl = event.image || getCategoryImageByEventId(event.category, event.id);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${dismissed ? 'h-0 mb-0 opacity-0' : ''}`}
      style={{ transform: `scale(${swipeScale})`, opacity: swipeOpacity }}
    >
      {/* Swipe action backgrounds */}
      {swipeEnabled && !compact && (
        <>
          {/* Save action (swipe right) */}
          <div
            className={`absolute inset-y-0 left-0 flex items-center justify-start px-6 rounded-2xl transition-all duration-200 ${
              swipeState.direction === 'right' && swipeState.deltaX > 40
                ? 'bg-emerald-500'
                : 'bg-emerald-100'
            }`}
            style={{ width: Math.max(0, swipeState.deltaX * 0.6 + 20) }}
          >
            <div className={`transition-transform duration-200 ${swipeState.deltaX > 80 ? 'scale-125' : 'scale-100'}`}>
              <svg className={`w-6 h-6 ${swipeState.deltaX > 40 ? 'text-white' : 'text-emerald-500'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
          </div>

          {/* Dismiss action (swipe left) */}
          <div
            className={`absolute inset-y-0 right-0 flex items-center justify-end px-6 rounded-2xl transition-all duration-200 ${
              swipeState.direction === 'left' && Math.abs(swipeState.deltaX) > 40
                ? 'bg-slate-500'
                : 'bg-slate-100'
            }`}
            style={{ width: Math.max(0, Math.abs(swipeState.deltaX) * 0.6 + 20) }}
          >
            <div className={`transition-transform duration-200 ${Math.abs(swipeState.deltaX) > 80 ? 'scale-125' : 'scale-100'}`}>
              <svg className={`w-6 h-6 ${Math.abs(swipeState.deltaX) > 40 ? 'text-white' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </>
      )}

      {/* Main card content */}
      <article
        onClick={handleClick}
        {...handlers}
        className={`relative bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 ${swipeState.isSwiping ? '' : 'hover:scale-[1.01]'}`}
        style={{
          height: compact ? 'auto' : '300px',
          transform: swipeTransform,
          transition: swipeState.isSwiping ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {/* Save animation overlay */}
        {showSaveAnimation && (
          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center z-10 animate-fade-in pointer-events-none">
            <div className="animate-bounce-save">
              <svg className="w-12 h-12 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
          </div>
        )}

        {compact ? (
          /* Compact mode - original text-only layout */
          <div className="flex gap-3 p-3">
            <div
              className={`w-1 rounded-full flex-shrink-0 ${happeningNow ? 'animate-pulse-live' : ''}`}
              style={{ backgroundColor: categoryColor.primary }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                {happeningNow ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Now
                  </span>
                ) : (
                  <span className="font-medium text-sky-600">{getRelativeTimeLabel(event.startAt)}</span>
                )}
                <span>·</span>
                <span>{formatEventTime(event.startAt, event.timezone)}</span>
              </div>
              <h3 className="font-semibold text-slate-900 text-sm line-clamp-1">{event.title}</h3>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{event.venueName || event.neighborhood}</p>
            </div>
          </div>
        ) : (
          /* Full card with image */
          <div className="h-full flex flex-col">
            {/* Image area - 160px height */}
            <div className="relative h-[160px] flex-shrink-0 overflow-hidden">
              <img
                src={imageUrl}
                alt={event.title}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

              {/* Top badges */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                {happeningNow && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                    </span>
                    Live
                  </span>
                )}
                {isNew && !happeningNow && (
                  <span className="px-2 py-1 bg-sky-500 text-white text-xs font-semibold rounded-full">New</span>
                )}
                {event.editorPick && (
                  <span className="px-2 py-1 bg-amber-400 text-amber-900 text-xs font-semibold rounded-full">Pick</span>
                )}
              </div>

              {/* Save/Follow buttons - top right */}
              <div className="absolute top-3 right-3 flex items-center gap-1">
                {onSave && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if ('vibrate' in navigator) navigator.vibrate(10);
                      setShowSaveAnimation(true);
                      onSave(event.id);
                      setTimeout(() => setShowSaveAnimation(false), 600);
                    }}
                    className={`p-2 rounded-full transition-all btn-press backdrop-blur-sm ${
                      isSaved ? 'bg-white text-emerald-500' : 'bg-black/30 text-white hover:bg-black/50'
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                )}
                {hasFollowOptions && onFollow && (
                  <div className="relative">
                    <button
                      onClick={handleFollowClick}
                      className={`p-2 rounded-full transition-all btn-press backdrop-blur-sm ${
                        isFollowingAny ? 'bg-white text-rose-500' : 'bg-black/30 text-white hover:bg-black/50'
                      }`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isFollowingAny ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                    {showFollowMenu && (
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 min-w-[160px] animate-scale-in">
                        {event.venueId && event.venueName && (
                          <button
                            onClick={(e) => handleFollowOption(e, 'venue', event.venueId!, event.venueName!)}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${isFollowingVenue ? 'text-rose-500' : 'text-slate-700'}`}
                          >
                            <span>📍</span>
                            <span>{isFollowingVenue ? 'Unfollow' : 'Follow'} venue</span>
                          </button>
                        )}
                        {event.seriesId && event.seriesName && (
                          <button
                            onClick={(e) => handleFollowOption(e, 'series', event.seriesId!, event.seriesName!)}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${isFollowingSeries ? 'text-rose-500' : 'text-slate-700'}`}
                          >
                            <span>🔁</span>
                            <span>{isFollowingSeries ? 'Unfollow' : 'Follow'} series</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => handleFollowOption(e, 'neighborhood', event.neighborhood, event.neighborhood)}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${isFollowingNeighborhood ? 'text-rose-500' : 'text-slate-700'}`}
                        >
                          <span>🏘️</span>
                          <span>{isFollowingNeighborhood ? 'Unfollow' : 'Follow'} area</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Category color indicator */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ backgroundColor: categoryColor.primary }}
              />
            </div>

            {/* Content area - flex-1 with justify-between to pin bottom */}
            <div className="flex-1 flex flex-col justify-between p-4">
              {/* Top section: metadata + title */}
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <span className="font-medium text-sky-600">{getRelativeTimeLabel(event.startAt)}</span>
                  <span>·</span>
                  <span>{formatEventTime(event.startAt, event.timezone)}</span>
                  {event.distanceMiles !== undefined && (
                    <>
                      <span>·</span>
                      <span>{formatDistance(event.distanceMiles)}</span>
                    </>
                  )}
                  {weather && (
                    <>
                      <span>·</span>
                      <span>{getWeatherIcon(weather.weatherCode)} {Math.round(weather.temperature)}°</span>
                    </>
                  )}
                </div>
                <h3 className="font-semibold text-slate-900 text-base line-clamp-2 leading-tight">{event.title}</h3>
                <p className="text-sm text-slate-500 line-clamp-1 mt-1">
                  {event.venueName || event.neighborhood}
                  {event.venueName && event.neighborhood && ` · ${event.neighborhood}`}
                </p>
              </div>

              {/* Bottom section: tags + price */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex flex-wrap gap-1.5">
                  {event.isOutdoor && <Chip label="Outdoor" size="sm" />}
                  {event.tags.slice(0, 2).map((tag) => (
                    <Chip key={tag} label={tag.replace(/-/g, ' ')} size="sm" />
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {priceDisplay && (
                    <span className={`text-sm font-medium ${priceDisplay === 'Free' ? 'text-emerald-600' : 'text-slate-700'}`}>
                      {priceDisplay}
                    </span>
                  )}
                  {event.ticketUrl && (
                    <a
                      href={event.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs px-2 py-1 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors btn-press"
                    >
                      Tickets
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 animate-pulse overflow-hidden h-[300px] flex flex-col">
      {/* Image area skeleton */}
      <div className="h-[160px] bg-slate-200 flex-shrink-0" />
      {/* Content area skeleton */}
      <div className="flex-1 flex flex-col justify-between p-4">
        <div>
          <div className="h-3 w-32 bg-slate-200 rounded mb-2" />
          <div className="h-5 w-3/4 bg-slate-200 rounded mb-1" />
          <div className="h-5 w-1/2 bg-slate-200 rounded mb-2" />
          <div className="h-3 w-2/3 bg-slate-200 rounded" />
        </div>
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-slate-200 rounded-full" />
            <div className="h-6 w-20 bg-slate-200 rounded-full" />
          </div>
          <div className="h-6 w-12 bg-slate-200 rounded" />
        </div>
      </div>
    </div>
  );
}
