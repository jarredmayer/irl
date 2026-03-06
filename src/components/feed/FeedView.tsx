import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { EventCard, EventCardSkeleton } from './EventCard';
import { HeroCard, HeroCardSkeleton } from './HeroCard';
import { FilterBar } from './FilterBar';
import { WeatherBanner } from './WeatherBanner';
import { MustardStrip } from '../yourcast/MustardStrip';
import { EmptyState } from '../ui/EmptyState';
import { getWeatherForTime } from '../../services/weather';
import { DEFAULT_FILTERS } from '../../constants';
import type { ScoredEvent, FilterState, FollowType, WeatherForecast } from '../../types';

interface FeedSection {
  title: string;
  events: ScoredEvent[];
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
  onConfigureAI?: () => void;
}

// Initial number of events to show, and how many to load on "Load more"
const INITIAL_EVENTS = 10;
const LOAD_MORE_COUNT = 10;

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
  onConfigureAI,
}: FeedViewProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [weatherDismissed, setWeatherDismissed] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_EVENTS);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(INITIAL_EVENTS);
  }, [filters]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if ('vibrate' in navigator) navigator.vibrate(10);
  };

  const handleDismiss = (eventId: string) => {
    setDismissedIds(prev => new Set([...prev, eventId]));
    onDismissEvent?.(eventId);
  };

  const handleLoadMore = useCallback(() => {
    setVisibleCount(prev => prev + LOAD_MORE_COUNT);
  }, []);

  // Flatten all events from all sections, filter dismissed, and sort by rank
  const allEvents = useMemo(() => {
    const events: ScoredEvent[] = [];
    for (const section of sections) {
      for (const event of section.events) {
        if (!dismissedIds.has(event.id)) {
          events.push(event);
        }
      }
    }
    // Sort by score (higher first)
    return events.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, [sections, dismissedIds]);

  // Get the #1 ranked event for hero (must be editor's pick with an image)
  const heroEvent = useMemo(() => {
    // First try to find an editor's pick with an image
    for (const event of allEvents) {
      if (event.editorPick && event.image) return event;
    }
    // Fallback to any editor's pick
    for (const event of allEvents) {
      if (event.editorPick) return event;
    }
    // Fallback to highest ranked event with an image
    for (const event of allEvents) {
      if (event.image) return event;
    }
    // Final fallback to first event
    return allEvents[0] || null;
  }, [allEvents]);

  // Events to show in the list (excluding hero)
  const listEvents = useMemo(() => {
    if (!heroEvent) return allEvents;
    return allEvents.filter(e => e.id !== heroEvent.id);
  }, [allEvents, heroEvent]);

  // Visible events based on load more
  const visibleEvents = listEvents.slice(0, visibleCount);
  const hasMore = visibleCount < listEvents.length;

  // Determine current section label based on filter
  const getSectionLabel = (): { left: string; right: string | null } => {
    switch (filters.timeFilter) {
      case 'tonight':
        return { left: 'TONIGHT', right: null };
      case 'today':
        return { left: 'TODAY', right: null };
      case 'tomorrow':
        return { left: 'TOMORROW', right: null };
      case 'weekend':
        return { left: 'THIS WEEKEND', right: null };
      default:
        return { left: 'UPCOMING', right: 'This Weekend →' };
    }
  };

  const sectionLabel = getSectionLabel();

  if (isLoading) {
    return (
      <div ref={feedRef}>
        <FilterBar
          filters={filters}
          onFiltersChange={onFiltersChange}
          hasLocation={hasLocation}
          onConfigureAI={onConfigureAI}
          weather={weather}
        />
        <HeroCardSkeleton />
        <div className="py-4">
          {[1, 2, 3].map((i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={feedRef}>
      {/* Weather-aware suggestions banner - above sticky filter bar */}
      {!weatherDismissed && weather && (
        <WeatherBanner
          weather={weather}
          onDismiss={() => setWeatherDismissed(true)}
        />
      )}

      <FilterBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        hasLocation={hasLocation}
        onConfigureAI={onConfigureAI}
        weather={weather}
      />

      {allEvents.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Try widening your search or check back later for new events."
          action={{
            label: 'Clear filters',
            onClick: () => onClearFilters ? onClearFilters() : onFiltersChange({ ...DEFAULT_FILTERS }),
          }}
        />
      ) : (
        <>
          {/* Hero card for #1 ranked event */}
          {heroEvent && (
            <HeroCard
              event={heroEvent}
              weather={weather ? getWeatherForTime(weather, heroEvent.startAt) ?? undefined : undefined}
              onSave={onSaveEvent}
              isSaved={savedEventIds.includes(heroEvent.id)}
            />
          )}

          {/* Section header */}
          {visibleEvents.length > 0 && (
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h2
                className="text-[11px] font-bold text-ink-3 uppercase"
                style={{ letterSpacing: '0.1em' }}
              >
                {sectionLabel.left}
              </h2>
              <span className="text-[11px] text-ink-3">
                {listEvents.length} →
              </span>
            </div>
          )}

          {/* Event feed */}
          <div className="pb-4">
            {visibleEvents.map((event, index) => (
              <div key={event.id}>
                <EventCard
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
                {/* Show Mustard Strip after 3rd event */}
                {index === 2 && filters.timeFilter === 'this-week' && (
                  <div className="mt-4">
                    <MustardStrip />
                  </div>
                )}
              </div>
            ))}

            {/* Load more button */}
            {hasMore && (
              <button
                onClick={handleLoadMore}
                className="mx-4 w-[calc(100%-2rem)] py-3 text-sm font-medium text-ink-2 bg-soft rounded-xl hover:bg-[var(--color-divider)] transition-colors btn-press"
              >
                Load more events ({listEvents.length - visibleCount} remaining)
              </button>
            )}

            {/* End of list indicator */}
            {!hasMore && visibleEvents.length > 0 && (
              <p className="text-center text-sm text-ink-3 py-4 mx-4">
                You've seen all {allEvents.length} events
              </p>
            )}
          </div>
        </>
      )}

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 p-3 bg-white rounded-full card-shadow border border-divider text-ink hover:bg-soft transition-all animate-fade-in z-30 btn-press"
          aria-label="Scroll to top"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
