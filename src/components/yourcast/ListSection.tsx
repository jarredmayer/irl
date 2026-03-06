import { EventCard } from '../feed/EventCard';
import type { ScoredEvent, FollowType } from '../../types';

interface ListSectionProps {
  events: ScoredEvent[];
  title: string;
  savedEventIds?: string[];
  onSaveEvent?: (eventId: string) => void;
  onFollow?: (id: string, type: FollowType, name: string) => void;
  followingVenueIds?: string[];
  followingSeriesIds?: string[];
  followingNeighborhoods?: string[];
}

export function ListSection({
  events,
  title,
  savedEventIds = [],
  onSaveEvent,
  onFollow,
  followingVenueIds = [],
  followingSeriesIds = [],
  followingNeighborhoods = [],
}: ListSectionProps) {
  if (events.length === 0) return null;

  return (
    <section className="py-6">
      {/* Section label */}
      <div className="px-4 mb-4">
        <p className="text-xs font-bold tracking-[0.15em] uppercase text-ink-3">
          THE LIST
        </p>
        <p className="text-sm font-medium text-ink-2 mt-1">
          {title}
        </p>
      </div>

      {/* Event cards - vertical list */}
      <div className="px-4 space-y-4">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onFollow={onFollow}
            isFollowingVenue={event.venueId ? followingVenueIds.includes(event.venueId) : false}
            isFollowingSeries={event.seriesId ? followingSeriesIds.includes(event.seriesId) : false}
            isFollowingNeighborhood={followingNeighborhoods.includes(event.neighborhood)}
            isSaved={savedEventIds.includes(event.id)}
            onSave={onSaveEvent}
          />
        ))}
      </div>
    </section>
  );
}
