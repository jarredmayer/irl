import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  formatEventDateLong,
  formatEventTimeRange,
  isHappeningNow,
} from '../../utils/time';
import { formatDistance } from '../../utils/distance';
import { getWeatherForTime, getWeatherIcon } from '../../services/weather';
import { openDirections } from '../../utils/directions';
import { ActionButtons } from './ActionButtons';
import { Chip, ChipGroup } from '../ui/Chip';
import { EmptyState } from '../ui/EmptyState';
import type { Event, ScoredEvent, FollowType, WeatherForecast } from '../../types';

interface EventDetailProps {
  event: Event | ScoredEvent | undefined;
  onFollow?: (id: string, type: FollowType, name: string) => void;
  isFollowingVenue?: boolean;
  isFollowingSeries?: boolean;
  isFollowingNeighborhood?: boolean;
  weather?: WeatherForecast | null;
}

export function EventDetail({
  event,
  onFollow,
  isFollowingVenue = false,
  isFollowingSeries = false,
  isFollowingNeighborhood = false,
  weather,
}: EventDetailProps) {
  const navigate = useNavigate();
  const [copiedAddress, setCopiedAddress] = useState(false);
  const eventWeather = event && weather ? getWeatherForTime(weather, event.startAt) : null;
  const happeningNow = event ? isHappeningNow(event.startAt, event.endAt) : false;

  const handleCopyAddress = async () => {
    if (!event?.address) return;
    try {
      await navigator.clipboard.writeText(event.address);
      setCopiedAddress(true);
      if ('vibrate' in navigator) navigator.vibrate(10);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch {
      // Clipboard API failed
    }
  };

  const handleOpenMaps = () => {
    if (!event) return;
    if (event.lat !== null && event.lng !== null) {
      openDirections({
        lat: event.lat,
        lng: event.lng,
        address: event.address,
        venueName: event.venueName,
      });
    } else if (event.address) {
      // Fallback to address-based directions
      const encodedAddress = encodeURIComponent(event.address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    }
  };

  if (!event) {
    return (
      <EmptyState
        title="Event not found"
        description="This event may have been removed or the link is incorrect."
        action={{
          label: 'Back to feed',
          onClick: () => navigate('/'),
        }}
      />
    );
  }

  const distanceMiles = 'distanceMiles' in event ? event.distanceMiles : undefined;

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <svg
              className="w-5 h-5 text-slate-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-slate-900 line-clamp-1">
            {event.title}
          </h1>
        </div>
      </div>

      {/* Image */}
      {event.image && (
        <div className="aspect-video bg-slate-100">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-4 space-y-4">
        {/* Title and badges */}
        <div>
          <div className="flex items-start gap-2 mb-2 flex-wrap">
            {happeningNow && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Happening Now
              </span>
            )}
            {event.editorPick && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                Editor's Pick
              </span>
            )}
            {event.isOutdoor && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                Outdoor
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{event.title}</h2>
        </div>

        {/* Date, time, location */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-600">
            <svg
              className="w-5 h-5 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <span>
              {formatEventDateLong(event.startAt, event.timezone)} ·{' '}
              {formatEventTimeRange(event.startAt, event.endAt, event.timezone)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-600">
            <svg
              className="w-5 h-5 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M12 21s-7-7.75-7-12a7 7 0 1 1 14 0c0 4.25-7 12-7 12z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <span>
              {event.venueName && `${event.venueName} · `}
              {event.neighborhood}, {event.city}
              {distanceMiles !== undefined && ` · ${formatDistance(distanceMiles)}`}
            </span>
          </div>

          {event.address && (
            <div className="flex items-center gap-2 pl-7">
              <p className="text-sm text-slate-500 flex-1">{event.address}</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopyAddress}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 btn-press"
                  title="Copy address"
                >
                  {copiedAddress ? (
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleOpenMaps}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 btn-press"
                  title="Open in Maps"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Weather forecast */}
        {eventWeather && (
          <div className="flex items-center gap-3 p-3 bg-sky-50 rounded-xl">
            <span className="text-2xl">{getWeatherIcon(eventWeather.weatherCode)}</span>
            <div>
              <p className="font-medium text-slate-900">
                {Math.round(eventWeather.temperature)}°F at event time
              </p>
              {eventWeather.precipitationProbability > 20 && (
                <p className="text-sm text-slate-600">
                  {eventWeather.precipitationProbability}% chance of rain
                </p>
              )}
            </div>
          </div>
        )}

        {/* Price */}
        {event.priceLabel && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Price:</span>
            <Chip label={event.priceLabel} size="sm" />
          </div>
        )}

        {/* Action buttons */}
        <ActionButtons event={event} />

        {/* Follow options */}
        {onFollow && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Follow for updates
            </h3>
            <div className="flex flex-wrap gap-2">
              {event.venueId && event.venueName && (
                <button
                  onClick={() => onFollow(event.venueId!, 'venue', event.venueName!)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isFollowingVenue
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>📍</span>
                  <span>{isFollowingVenue ? 'Following' : 'Follow'} {event.venueName}</span>
                </button>
              )}
              {event.seriesId && event.seriesName && (
                <button
                  onClick={() => onFollow(event.seriesId!, 'series', event.seriesName!)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isFollowingSeries
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>🔁</span>
                  <span>{isFollowingSeries ? 'Following' : 'Follow'} {event.seriesName}</span>
                </button>
              )}
              <button
                onClick={() => onFollow(event.neighborhood, 'neighborhood', event.neighborhood)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isFollowingNeighborhood
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>🏘️</span>
                <span>{isFollowingNeighborhood ? 'Following' : 'Follow'} {event.neighborhood}</span>
              </button>
            </div>
          </div>
        )}

        {/* Editorial why */}
        <div className="pt-2">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Why we recommend it
          </h3>
          <p className="text-slate-700 leading-relaxed">{event.editorialWhy}</p>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
            About
          </h3>
          <p className="text-slate-600 leading-relaxed">{event.description}</p>
        </div>

        {/* Tags */}
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Tags
          </h3>
          <ChipGroup>
            {event.tags.map((tag) => (
              <Chip key={tag} label={tag.replace(/-/g, ' ')} size="sm" />
            ))}
          </ChipGroup>
        </div>

        {/* Source */}
        {event.source && (
          <div className="pt-2 border-t border-slate-100">
            <a
              href={event.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-sky-600 hover:text-sky-700"
            >
              More info at {event.source.name} →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
