import { useState, useEffect, useRef, useMemo } from 'react';
import { EventCard, EventCardSkeleton } from './EventCard';
import { FilterBar } from './FilterBar';
import { WeatherBanner } from './WeatherBanner';
import { EmptyState } from '../ui/EmptyState';
import { getWeatherForTime } from '../../services/weather';
import { DEFAULT_FILTERS } from '../../constants';
import type { ScoredEvent, FilterState, FollowType, WeatherForecast } from '../../types';

interface FeedSection {
  title: string;
  events: ScoredEvent[];
}

interface EventSeriesGroup {
  seriesId: string;
  seriesName: string;
  events: ScoredEvent[];
  nextEvent: ScoredEvent;
}

interface FeedViewProps {
  sections: FeedSection[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  hasLocation: boolean;
  isLoading?: boolean;
  onClearFilters?: () => void;
  onFollow?: (id: string, type: FollowType, name: string) => void;
  followingVenueIds?: string[];
  followingSeriesIds?: string[];
  followingNeighborhoods?: string[];
  weather?: WeatherForecast | null;
  savedEventIds?: string[];
  onSaveEvent?: (eventId: string) => void;
  onDismissEvent?: (eventId: string) => void;
}

// Group events by series, keeping first occurrence of each series
function groupEventsBySeries(events: ScoredEvent[]): { regular: ScoredEvent[]; grouped: EventSeriesGroup[] } {
  const seriesMap = new Map<string, ScoredEvent[]>();
  const regular: ScoredEvent[] = [];

  for (const event of events) {
    if (event.seriesId && event.isRecurring) {
      const existing = seriesMap.get(event.seriesId) || [];
      seriesMap.set(event.seriesId, [...existing, event]);
    } else {
      regular.push(event);
    }
  }

  const grouped: EventSeriesGroup[] = [];
  for (const [seriesId, seriesEvents] of seriesMap) {
    if (seriesEvents.length > 1) {
      // Sort by start time
      const sorted = [...seriesEvents].sort((a, b) =>
        new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      );
      grouped.push({
        seriesId,
        seriesName: sorted[0].seriesName || sorted[0].title,
        events: sorted,
        nextEvent: sorted[0],
      });
    } else {
      // Single event in series, treat as regular
      regular.push(seriesEvents[0]);
    }
  }

  return { regular, grouped };
}

export function FeedView({
  sections,
  filters,
  onFiltersChange,
  hasLocation,
  isLoading = false,
  onClearFilters,
  onFollow,
  followingVenueIds = [],
  followingSeriesIds = [],
  followingNeighborhoods = [],
  weather,
  savedEventIds = [],
  onSaveEvent,
  onDismissEvent,
}: FeedViewProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [weatherDismissed, setWeatherDismissed] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  // Handle scroll for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if ('vibrate' in navigator) navigator.vibrate(10);
  };

  const handleDismiss = (eventId: string) => {
    setDismissedIds(prev => new Set([...prev, eventId]));
    onDismissEvent?.(eventId);
  };

  // Filter out dismissed events and group by series
  const processedSections = useMemo(() => {
    return sections.map(section => {
      const visibleEvents = section.events.filter(e => !dismissedIds.has(e.id));
      const { regular, grouped } = groupEventsBySeries(visibleEvents);

      return {
        ...section,
        regularEvents: regular,
        groupedSeries: grouped,
        totalCount: regular.length + grouped.length,
      };
    });
  }, [sections, dismissedIds]);

  const totalEvents = processedSections.reduce((sum, s) => sum + s.totalCount, 0);

  if (isLoading) {
    return (
      <div ref={feedRef}>
        <FilterBar
          filters={filters}
          onFiltersChange={onFiltersChange}
          hasLocation={hasLocation}
        />
        <div className="px-4 py-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={feedRef}>
      <FilterBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        hasLocation={hasLocation}
      />

      {/* Weather-aware suggestions banner */}
      {!weatherDismissed && (
        <WeatherBanner
          weather={weather ?? null}
          onDismiss={() => setWeatherDismissed(true)}
        />
      )}

      {totalEvents === 0 ? (
        <EmptyState
          title="No events found"
          description="Try adjusting your filters or check back later for new events."
          action={{
            label: 'Clear filters',
            onClick: () => onClearFilters ? onClearFilters() : onFiltersChange({ ...DEFAULT_FILTERS }),
          }}
        />
      ) : (
        <div className="px-4 py-3 space-y-4">
          {processedSections.map(
            (section) =>
              section.totalCount > 0 && (
                <section key={section.title}>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                      {section.title}
                    </h2>
                    <span className="text-xs text-slate-400">{section.totalCount} events</span>
                  </div>
                  <div className="space-y-2">
                    {/* Grouped series */}
                    {section.groupedSeries.map((group) => (
                      <EventSeriesCard
                        key={group.seriesId}
                        group={group}
                        weather={weather}
                        onFollow={onFollow}
                        followingSeriesIds={followingSeriesIds}
                        followingVenueIds={followingVenueIds}
                        followingNeighborhoods={followingNeighborhoods}
                        savedEventIds={savedEventIds}
                        onSaveEvent={onSaveEvent}
                      />
                    ))}

                    {/* Regular events */}
                    {section.regularEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onFollow={onFollow}
                        isFollowingVenue={event.venueId ? followingVenueIds.includes(event.venueId) : false}
                        isFollowingSeries={event.seriesId ? followingSeriesIds.includes(event.seriesId) : false}
                        isFollowingNeighborhood={followingNeighborhoods.includes(event.neighborhood)}
                        weather={weather ? getWeatherForTime(weather, event.startAt) ?? undefined : undefined}
                        isSaved={savedEventIds.includes(event.id)}
                        onSave={onSaveEvent}
                        onDismiss={handleDismiss}
                      />
                    ))}
                  </div>
                </section>
              )
          )}
        </div>
      )}

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 p-3 bg-white rounded-full shadow-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all animate-fade-in z-30 btn-press"
          aria-label="Scroll to top"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

// Event series card with expand/collapse
interface EventSeriesCardProps {
  group: EventSeriesGroup;
  weather?: WeatherForecast | null;
  onFollow?: (id: string, type: FollowType, name: string) => void;
  followingSeriesIds: string[];
  followingVenueIds: string[];
  followingNeighborhoods: string[];
  savedEventIds: string[];
  onSaveEvent?: (eventId: string) => void;
}

function EventSeriesCard({
  group,
  weather,
  onFollow,
  followingSeriesIds,
  followingVenueIds,
  followingNeighborhoods,
  savedEventIds,
  onSaveEvent,
}: EventSeriesCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isFollowingSeries = followingSeriesIds.includes(group.seriesId);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Main card showing next event */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs font-medium">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Recurring
            </span>
            <span className="text-xs text-slate-400">{group.events.length} dates</span>
          </div>
          {onFollow && (
            <button
              onClick={() => onFollow(group.seriesId, 'series', group.seriesName)}
              className={`p-1.5 rounded-full transition-all btn-press ${
                isFollowingSeries ? 'text-rose-500 bg-rose-50' : 'text-slate-300 hover:text-slate-400'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isFollowingSeries ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          )}
        </div>

        <EventCard
          event={group.nextEvent}
          compact={false}
          onFollow={onFollow}
          isFollowingVenue={group.nextEvent.venueId ? followingVenueIds.includes(group.nextEvent.venueId) : false}
          isFollowingSeries={isFollowingSeries}
          isFollowingNeighborhood={followingNeighborhoods.includes(group.nextEvent.neighborhood)}
          weather={weather ? getWeatherForTime(weather, group.nextEvent.startAt) ?? undefined : undefined}
          isSaved={savedEventIds.includes(group.nextEvent.id)}
          onSave={onSaveEvent}
          swipeEnabled={false}
        />

        {/* Expand button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 py-2 text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1 transition-colors"
        >
          <span>{isExpanded ? 'Hide' : 'Show'} {group.events.length - 1} more dates</span>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded dates */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-3 space-y-2 animate-fade-in">
          {group.events.slice(1).map((event) => (
            <EventCard
              key={event.id}
              event={event}
              compact={true}
              onFollow={onFollow}
              isFollowingVenue={event.venueId ? followingVenueIds.includes(event.venueId) : false}
              isFollowingSeries={isFollowingSeries}
              isFollowingNeighborhood={followingNeighborhoods.includes(event.neighborhood)}
              isSaved={savedEventIds.includes(event.id)}
              onSave={onSaveEvent}
              swipeEnabled={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
