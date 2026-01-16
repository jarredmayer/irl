import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatEventTime, getRelativeTimeLabel } from '../../utils/time';
import { formatDistance } from '../../utils/distance';
import { getWeatherIcon } from '../../services/weather';
import { Chip } from '../ui/Chip';
import { CATEGORY_COLORS } from '../../constants';
import type { ScoredEvent, HourlyWeather, FollowType } from '../../types';

interface EventCardProps {
  event: ScoredEvent;
  compact?: boolean;
  weather?: HourlyWeather;
  onFollow?: (id: string, type: FollowType, name: string) => void;
  isFollowingVenue?: boolean;
  isFollowingSeries?: boolean;
  isFollowingNeighborhood?: boolean;
}

export function EventCard({
  event,
  compact = false,
  weather,
  onFollow,
  isFollowingVenue = false,
  isFollowingSeries = false,
  isFollowingNeighborhood = false,
}: EventCardProps) {
  const navigate = useNavigate();
  const [showFollowMenu, setShowFollowMenu] = useState(false);
  const categoryColor = CATEGORY_COLORS[event.category] || CATEGORY_COLORS['Other'];

  const handleClick = () => navigate(`/event/${event.id}`);

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

  return (
    <article
      onClick={handleClick}
      className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all duration-200 ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="flex gap-3">
        {/* Category indicator */}
        <div
          className="w-1 rounded-full flex-shrink-0"
          style={{ backgroundColor: categoryColor.primary }}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
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

            {/* Follow button */}
            {hasFollowOptions && onFollow && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={handleFollowClick}
                  className={`p-1.5 rounded-full transition-all ${
                    isFollowingAny ? 'text-rose-500 bg-rose-50' : 'text-slate-300 hover:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isFollowingAny ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
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

          {/* Title */}
          <h3 className={`font-semibold text-slate-900 line-clamp-1 ${compact ? 'text-sm' : 'text-base'}`}>
            {event.editorPick && <span className="inline-block w-2 h-2 bg-amber-400 rounded-full mr-1.5 align-middle" />}
            {event.title}
          </h3>

          {/* Venue/Neighborhood */}
          <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">
            {event.venueName || event.neighborhood}
            {event.venueName && event.neighborhood && ` · ${event.neighborhood}`}
          </p>

          {/* Short why */}
          {!compact && <p className="text-sm text-slate-600 line-clamp-2 mt-2">{event.shortWhy}</p>}

          {/* Tags and Price */}
          {!compact && (
            <div className="flex items-center justify-between mt-3">
              <div className="flex flex-wrap gap-1.5">
                {event.isOutdoor && <Chip label="Outdoor" size="sm" />}
                {event.tags.slice(0, 2).map((tag) => (
                  <Chip key={tag} label={tag.replace(/-/g, ' ')} size="sm" />
                ))}
              </div>

              <div className="flex items-center gap-2">
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
                    className="text-xs px-2 py-1 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                  >
                    Tickets
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100">
      <div className="flex gap-3">
        <div className="w-1 rounded-full skeleton" />
        <div className="flex-1">
          <div className="h-3 w-24 skeleton rounded mb-2" />
          <div className="h-5 w-3/4 skeleton rounded mb-2" />
          <div className="h-3 w-1/2 skeleton rounded mb-3" />
          <div className="h-4 w-full skeleton rounded" />
        </div>
      </div>
    </div>
  );
}
