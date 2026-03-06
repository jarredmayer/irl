import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  formatEventDateLong,
  formatEventTimeRange,
  isHappeningNow,
  isNewlyAdded,
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
  const isNew = event ? isNewlyAdded(event.addedAt) : false;

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
      <div className="sticky top-0 z-10 bg-white border-b border-divider">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-soft transition-colors btn-press"
          >
            <svg
              className="w-5 h-5 text-ink-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-serif text-ink line-clamp-1">
            {event.title}
          </h1>
        </div>
      </div>

      {/* Image */}
      {event.image && (
        <div className="aspect-video bg-soft">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-5 space-y-5">
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
                Editor&apos;s Pick
              </span>
            )}
            {event.isOutdoor && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full"
                    style={{ backgroundColor: 'var(--color-teal, #2E6560)' + '18', color: 'var(--color-teal, #2E6560)' }}>
                Outdoor
              </span>
            )}
            {isNew && !happeningNow && (
              <span className="px-2 py-0.5 bg-soft text-ink-2 text-xs font-medium rounded-full">
                New
              </span>
            )}
          </div>
          <h2 className="text-2xl font-serif text-ink">{event.title}</h2>
        </div>

        {/* Date, time, location */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-ink-2">
            <svg
              className="w-5 h-5 flex-shrink-0 text-ink-3"
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

          <div className="flex items-center gap-2 text-ink-2">
            <svg
              className="w-5 h-5 flex-shrink-0 text-ink-3"
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
              <p className="text-sm text-ink-3 flex-1">{event.address}</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopyAddress}
                  className="p-1.5 rounded-lg hover:bg-soft transition-colors text-ink-3 hover:text-ink-2 btn-press"
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
                  className="p-1.5 rounded-lg hover:bg-soft transition-colors text-ink-3 hover:text-ink-2 btn-press"
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
          <div className="flex items-center gap-3 p-3 bg-soft rounded-xl border border-divider">
            <span className="text-2xl">{getWeatherIcon(eventWeather.weatherCode)}</span>
            <div>
              <p className="font-medium text-ink">
                {Math.round(eventWeather.temperature)}°F at event time
              </p>
              {eventWeather.precipitationProbability > 20 && (
                <p className="text-sm text-ink-2">
                  {eventWeather.precipitationProbability}% chance of rain
                </p>
              )}
            </div>
          </div>
        )}

        {/* Price */}
        {event.priceLabel && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-3">Price:</span>
            <Chip label={event.priceLabel} size="sm" />
          </div>
        )}

        {/* Action buttons */}
        <ActionButtons event={event} />

        {/* Follow options */}
        {onFollow && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-ink-3 uppercase tracking-wide">
              Follow for updates
            </h3>
            <div className="flex flex-wrap gap-2">
              {event.venueId && event.venueName && (
                <button
                  onClick={() => onFollow(event.venueId!, 'venue', event.venueName!)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors btn-press ${
                    isFollowingVenue
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-soft text-ink-2 hover:bg-[var(--color-divider)]'
                  }`}
                >
                  <span>{isFollowingVenue ? 'Following' : 'Follow'} {event.venueName}</span>
                </button>
              )}
              {event.seriesId && event.seriesName && (
                <button
                  onClick={() => onFollow(event.seriesId!, 'series', event.seriesName!)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors btn-press ${
                    isFollowingSeries
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-soft text-ink-2 hover:bg-[var(--color-divider)]'
                  }`}
                >
                  <span>{isFollowingSeries ? 'Following' : 'Follow'} {event.seriesName}</span>
                </button>
              )}
              <button
                onClick={() => onFollow(event.neighborhood, 'neighborhood', event.neighborhood)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors btn-press ${
                  isFollowingNeighborhood
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-soft text-ink-2 hover:bg-[var(--color-divider)]'
                }`}
              >
                <span>{isFollowingNeighborhood ? 'Following' : 'Follow'} {event.neighborhood}</span>
              </button>
            </div>
          </div>
        )}

        {/* Why this, why now — contextual reasoning */}
        <div className="pt-2">
          <h3 className="text-xs font-medium text-ink-3 uppercase tracking-wide mb-2">
            Why we recommend it
          </h3>
          <WhyThisWhyNow event={event} isNew={isNew} />
          <p className="text-ink-2 leading-relaxed mt-2">{event.editorialWhy}</p>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-xs font-medium text-ink-3 uppercase tracking-wide mb-2">
            About
          </h3>
          <p className="text-ink-2 leading-relaxed">{event.description}</p>
        </div>

        {/* Tags */}
        <div>
          <h3 className="text-xs font-medium text-ink-3 uppercase tracking-wide mb-2">
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
          <div className="pt-4 border-t border-divider">
            <a
              href={event.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-ink-2 hover:text-ink"
            >
              More info at {event.source.name} →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// Local neighborhoods that signal hidden gem quality
const LOCAL_NEIGHBORHOODS = [
  'Little Havana', 'Little Haiti', 'Allapattah', 'Little River',
  'Hialeah', 'Overtown', 'Liberty City', 'Flagler Village',
];

/**
 * Contextual reasoning chips — explains *why* this event is surfaced.
 * Shown only on detail page to avoid feed clutter.
 */
function WhyThisWhyNow({ event, isNew }: { event: Event | ScoredEvent; isNew: boolean }) {
  const reasons: { label: string; color: string }[] = [];

  if (event.editorPick) {
    reasons.push({ label: 'Curated pick — rare or culturally significant', color: 'var(--color-ochre, #9C6B28)' });
  }

  if (LOCAL_NEIGHBORHOODS.some(n => event.neighborhood?.toLowerCase() === n.toLowerCase())) {
    reasons.push({ label: `Hidden gem — ${event.neighborhood}`, color: 'var(--color-mauve, #7A5C72)' });
  }

  if (event.priceLabel === 'Free') {
    reasons.push({ label: 'Free to attend', color: 'var(--color-teal, #2E6560)' });
  }

  if (event.isOutdoor) {
    reasons.push({ label: 'Outdoor event — check weather', color: 'var(--color-teal, #2E6560)' });
  }

  if (isNew) {
    reasons.push({ label: 'Just added to the feed', color: 'var(--color-slate, #3D5068)' });
  }

  if (reasons.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {reasons.map(({ label, color }) => (
        <span
          key={label}
          className="text-xs px-2 py-1 rounded-lg"
          style={{ backgroundColor: color + '18', color }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
