import { EventCard, EventCardSkeleton } from './EventCard';
import { FilterBar } from './FilterBar';
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
}: FeedViewProps) {
  const totalEvents = sections.reduce((sum, s) => sum + s.events.length, 0);

  if (isLoading) {
    return (
      <div>
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
    <div>
      <FilterBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        hasLocation={hasLocation}
      />

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
        <div className="px-4 py-4 space-y-6">
          {sections.map(
            (section) =>
              section.events.length > 0 && (
                <section key={section.title}>
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    {section.title}
                  </h2>
                  <div className="space-y-3">
                    {section.events.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onFollow={onFollow}
                        isFollowingVenue={event.venueId ? followingVenueIds.includes(event.venueId) : false}
                        isFollowingSeries={event.seriesId ? followingSeriesIds.includes(event.seriesId) : false}
                        isFollowingNeighborhood={followingNeighborhoods.includes(event.neighborhood)}
                        weather={weather ? getWeatherForTime(weather, event.startAt) ?? undefined : undefined}
                      />
                    ))}
                  </div>
                </section>
              )
          )}
        </div>
      )}
    </div>
  );
}
