import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isHappeningNow } from '../../utils/time';
import { getCategorySwatchColor } from '../../utils/category';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { generateEventImage, getFallbackImage } from '../../agents/image-agent';
import type { ScoredEvent, HourlyWeather, FollowType } from '../../types';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

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

// Format date like "SAT MAR 8 · 7 PM"
function formatDateDisplay(startAt: string, timezone: string): string {
  const date = toZonedTime(new Date(startAt), timezone);
  const dayOfWeek = format(date, 'EEE').toUpperCase();
  const month = format(date, 'MMM').toUpperCase();
  const day = format(date, 'd');
  const time = format(date, 'h a').replace(':00', '');
  return `${dayOfWeek} ${month} ${day} · ${time}`;
}

export function EventCard({
  event,
  compact = false,
  weather: _weather,
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

  // Image state: start with existing image or fallback for instant render
  const [imgUrl, setImgUrl] = useState<string>(
    () => event.image || getFallbackImage(event.category, event.id)
  );

  // Fetch better image if none exists
  useEffect(() => {
    if (!event.image) {
      generateEventImage(event).then(setImgUrl);
    } else {
      setImgUrl(event.image);
    }
  }, [event]);

  const swatchColor = getCategorySwatchColor(event.category);

  const happeningNow = useMemo(() => isHappeningNow(event.startAt, event.endAt), [event.startAt, event.endAt]);

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

  // Calculate swipe transform with resistance at edges
  const swipeTransform = swipeState.isSwiping
    ? `translateX(${swipeState.deltaX * 0.6}px)`
    : 'translateX(0)';

  const swipeOpacity = dismissed ? 0 : 1;
  const swipeScale = dismissed ? 0.9 : 1;

  const cardHeight = compact ? 148 : 160;

  // Compact variant for lists
  if (compact) {
    return (
      <article
        onClick={handleClick}
        className="flex items-center gap-3 p-3 bg-white rounded-xl cursor-pointer hover:bg-soft transition-colors"
      >
        {/* Color swatch */}
        <div
          className="w-1 h-12 rounded-full flex-shrink-0"
          style={{ backgroundColor: swatchColor }}
        />

        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-base text-ink line-clamp-1">{event.title}</h3>
          <p className="text-sm text-ink-3 line-clamp-1">
            {formatDateDisplay(event.startAt, event.timezone)}
          </p>
        </div>

        {onSave && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave(event.id);
            }}
            className={`p-2 rounded-full transition-colors ${
              isSaved ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5}>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        )}
      </article>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-[22px] mx-4 mb-3 transition-all duration-300 ${dismissed ? 'h-0 mb-0 opacity-0' : ''}`}
      style={{ transform: `scale(${swipeScale})`, opacity: swipeOpacity }}
    >
      {/* Swipe action backgrounds */}
      {swipeEnabled && (
        <>
          {/* Save action (swipe right) */}
          <div
            className={`absolute inset-y-0 left-0 flex items-center justify-start px-6 rounded-[22px] transition-all duration-200 ${
              swipeState.direction === 'right' && swipeState.deltaX > 40
                ? 'bg-teal'
                : 'bg-soft'
            }`}
            style={{ width: Math.max(0, swipeState.deltaX * 0.6 + 20) }}
          >
            <div className={`transition-transform duration-200 ${swipeState.deltaX > 80 ? 'scale-125' : 'scale-100'}`}>
              <svg className={`w-6 h-6 ${swipeState.deltaX > 40 ? 'text-white' : 'text-teal'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          </div>

          {/* Dismiss action (swipe left) */}
          <div
            className={`absolute inset-y-0 right-0 flex items-center justify-end px-6 rounded-[22px] transition-all duration-200 ${
              swipeState.direction === 'left' && Math.abs(swipeState.deltaX) > 40
                ? 'bg-ink-2'
                : 'bg-soft'
            }`}
            style={{ width: Math.max(0, Math.abs(swipeState.deltaX) * 0.6 + 20) }}
          >
            <div className={`transition-transform duration-200 ${Math.abs(swipeState.deltaX) > 80 ? 'scale-125' : 'scale-100'}`}>
              <svg className={`w-6 h-6 ${Math.abs(swipeState.deltaX) > 40 ? 'text-white' : 'text-ink-2'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
        className="relative bg-white rounded-[22px] overflow-hidden cursor-pointer transition-all duration-200 border border-divider"
        style={{
          transform: swipeTransform,
          transition: swipeState.isSwiping ? 'none' : 'transform 0.3s ease-out',
          boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
          height: `${cardHeight}px`,
        }}
      >
        {/* Save animation overlay */}
        {showSaveAnimation && (
          <div className="absolute inset-0 bg-teal/20 flex items-center justify-center z-10 animate-fade-in pointer-events-none">
            <div className="animate-bounce-save">
              <svg className="w-12 h-12 text-teal" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          </div>
        )}

        {/* Card layout: image left, content right */}
        <div className="flex h-full">
          {/* LEFT — Image area (120px wide) */}
          <div className="w-[120px] flex-shrink-0 relative overflow-hidden" style={{ borderRadius: '22px 0 0 22px' }}>
            <img
              src={imgUrl}
              alt={event.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />

            {/* HAPPENING NOW badge */}
            {happeningNow && (
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-burgundy rounded-full">
                <span className="text-white text-[10px] font-medium">● NOW</span>
              </div>
            )}
          </div>

          {/* RIGHT — Content area */}
          <div className="flex-1 p-3 flex flex-col justify-between min-w-0 relative">
            {/* Save button (absolute, top-right) */}
            {onSave && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if ('vibrate' in navigator) navigator.vibrate(10);
                  setShowSaveAnimation(true);
                  onSave(event.id);
                  setTimeout(() => setShowSaveAnimation(false), 600);
                }}
                className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all btn-press ${
                  isSaved
                    ? 'bg-ink text-white'
                    : 'bg-white border border-ink-3 text-ink-3 hover:text-ink hover:border-ink'
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            )}

            {/* TOP ROW: swatch + category */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: swatchColor }}
                />
                <span className="text-[12px] font-medium text-ink-3 uppercase tracking-wide">
                  {event.category}
                </span>
              </div>

              {/* MIDDLE: Title */}
              <h3
                className="font-serif text-[17px] text-ink leading-snug pr-8"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {event.title}
              </h3>
            </div>

            {/* BOTTOM ROW */}
            <div className="mt-auto">
              {/* Venue · Neighborhood */}
              <p className="text-[13px] text-ink-3 truncate mb-0.5">
                <span className="mr-1">◎</span>
                {event.venueName}
                {event.venueName && event.neighborhood && ' · '}
                {event.neighborhood}
              </p>

              {/* Date/time */}
              <p className="text-[13px] font-medium text-ink-2 uppercase tracking-wide">
                {formatDateDisplay(event.startAt, event.timezone)}
              </p>
            </div>
          </div>
        </div>

        {/* Follow menu (shown on click) */}
        {showFollowMenu && hasFollowOptions && onFollow && (
          <div
            className="absolute right-3 top-12 bg-white rounded-xl border border-divider py-1 z-50 min-w-[160px] animate-scale-in"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {event.venueId && event.venueName && (
              <button
                onClick={(e) => handleFollowOption(e, 'venue', event.venueId!, event.venueName!)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-soft flex items-center gap-2 ${isFollowingVenue ? 'text-burgundy' : 'text-ink'}`}
              >
                <span>📍</span>
                <span>{isFollowingVenue ? 'Unfollow' : 'Follow'} venue</span>
              </button>
            )}
            {event.seriesId && event.seriesName && (
              <button
                onClick={(e) => handleFollowOption(e, 'series', event.seriesId!, event.seriesName!)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-soft flex items-center gap-2 ${isFollowingSeries ? 'text-burgundy' : 'text-ink'}`}
              >
                <span>🔁</span>
                <span>{isFollowingSeries ? 'Unfollow' : 'Follow'} series</span>
              </button>
            )}
            <button
              onClick={(e) => handleFollowOption(e, 'neighborhood', event.neighborhood, event.neighborhood)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-soft flex items-center gap-2 ${isFollowingNeighborhood ? 'text-burgundy' : 'text-ink'}`}
            >
              <span>🏘️</span>
              <span>{isFollowingNeighborhood ? 'Unfollow' : 'Follow'} area</span>
            </button>
          </div>
        )}

        {/* Hidden follow trigger for cards with follow options */}
        {hasFollowOptions && onFollow && !showFollowMenu && (
          <button
            onClick={handleFollowClick}
            className={`absolute bottom-3 right-3 p-1.5 rounded-full transition-all btn-press ${
              isFollowingAny ? 'text-burgundy bg-burgundy/10' : 'text-ink-3 hover:text-ink-2 hover:bg-soft'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isFollowingAny ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        )}
      </article>
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div
      className="mx-4 mb-3 bg-white rounded-[22px] overflow-hidden animate-pulse border border-divider"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)', height: '160px' }}
    >
      <div className="flex h-full">
        {/* Image placeholder */}
        <div className="w-[120px] flex-shrink-0 bg-soft" style={{ borderRadius: '22px 0 0 22px' }} />
        {/* Content placeholder */}
        <div className="flex-1 p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-3 h-3 rounded-full bg-divider" />
              <div className="h-3 w-12 bg-divider rounded" />
            </div>
            <div className="h-5 w-3/4 bg-divider rounded mb-1" />
            <div className="h-5 w-1/2 bg-divider rounded" />
          </div>
          <div>
            <div className="h-3.5 w-2/3 bg-divider rounded mb-1" />
            <div className="h-3.5 w-1/3 bg-divider rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
