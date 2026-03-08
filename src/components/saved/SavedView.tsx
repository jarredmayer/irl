import { useState } from 'react';
import { format } from 'date-fns';
import { EventCard } from '../feed/EventCard';
import { EmptyState } from '../ui/EmptyState';
import type { ScoredEvent, FollowItem, FollowType } from '../../types';

interface SavedViewProps {
  savedEvents: ScoredEvent[];
  followingEvents: ScoredEvent[];
  following: FollowItem[];
  onUnfollow: (id: string, type: FollowType) => void;
  onFollow: (id: string, type: FollowType, name: string) => void;
  followingVenueIds: string[];
  followingSeriesIds: string[];
  followingNeighborhoods: string[];
  savedEventIds: string[];
  onSaveEvent: (eventId: string) => void;
}

type TabType = 'saved' | 'following';

export function SavedView({
  savedEvents,
  followingEvents,
  following,
  onUnfollow,
  onFollow,
  followingVenueIds,
  followingSeriesIds,
  followingNeighborhoods,
  savedEventIds,
  onSaveEvent,
}: SavedViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('saved');

  const groupedFollowing = {
    venue: following.filter((f) => f.type === 'venue'),
    series: following.filter((f) => f.type === 'series'),
    neighborhood: following.filter((f) => f.type === 'neighborhood'),
    organizer: following.filter((f) => f.type === 'organizer'),
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-[52px] z-20 bg-white border-b border-divider">
        <div className="px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'saved'
                  ? 'bg-ink text-white'
                  : 'bg-soft text-ink-2 hover:bg-[var(--color-divider)]'
              }`}
            >
              Saved ({savedEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'following'
                  ? 'bg-ink text-white'
                  : 'bg-soft text-ink-2 hover:bg-[var(--color-divider)]'
              }`}
            >
              Following ({following.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'saved' ? (
        savedEvents.length === 0 ? (
          <EmptyState
            title="No saved events"
            description="Tap the heart on any event to save it here for later."
            icon={
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            }
          />
        ) : (
          <div className="px-4 py-4 space-y-3">
            {savedEvents.map((event) => (
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
        )
      ) : following.length === 0 ? (
        <EmptyState
          title="Not following anything yet"
          description="Follow venues, series, or neighborhoods to keep up with their events."
          icon={
            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          }
        />
      ) : (
        <div className="px-4 py-4 space-y-6">
          {groupedFollowing.venue.length > 0 && (
            <FollowSection
              title="Venues"
              items={groupedFollowing.venue}
              allEvents={followingEvents}
              onUnfollow={onUnfollow}
              emoji="📍"
              getEventIds={(item) => followingEvents.filter(e => e.venueId === item.id).map(e => e.id)}
            />
          )}
          {groupedFollowing.series.length > 0 && (
            <FollowSection
              title="Series"
              items={groupedFollowing.series}
              allEvents={followingEvents}
              onUnfollow={onUnfollow}
              emoji="🔁"
              getEventIds={(item) => followingEvents.filter(e => e.seriesId === item.id).map(e => e.id)}
            />
          )}
          {groupedFollowing.neighborhood.length > 0 && (
            <FollowSection
              title="Neighborhoods"
              items={groupedFollowing.neighborhood}
              allEvents={followingEvents}
              onUnfollow={onUnfollow}
              emoji="🏘️"
              getEventIds={(item) => followingEvents.filter(e => e.neighborhood === item.id).map(e => e.id)}
            />
          )}
          {groupedFollowing.organizer.length > 0 && (
            <FollowSection
              title="Organizers"
              items={groupedFollowing.organizer}
              allEvents={followingEvents}
              onUnfollow={onUnfollow}
              emoji="👤"
              getEventIds={() => []}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FollowSection({
  title,
  items,
  allEvents,
  onUnfollow,
  emoji,
  getEventIds,
}: {
  title: string;
  items: FollowItem[];
  allEvents: ScoredEvent[];
  onUnfollow: (id: string, type: FollowType) => void;
  emoji: string;
  getEventIds: (item: FollowItem) => string[];
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-ink-2 uppercase tracking-wide mb-3 flex items-center gap-2">
        <span>{emoji}</span>
        <span>{title}</span>
        <span className="text-ink-3">({items.length})</span>
      </h2>
      <div className="space-y-2">
        {items.map((item) => {
          const itemEventIds = getEventIds(item);
          const itemEvents = allEvents
            .filter(e => itemEventIds.includes(e.id))
            .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
          const nextEvent = itemEvents[0];

          return (
            <div
              key={`${item.type}-${item.id}`}
              className="bg-white rounded-xl border border-divider overflow-hidden"
            >
              <div className="flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-ink">{item.name}</span>
                  {itemEvents.length > 0 && (
                    <span className="ml-2 text-xs text-ink-2 font-medium">
                      {itemEvents.length} upcoming
                    </span>
                  )}
                  {nextEvent && (
                    <p className="text-xs text-ink-3 mt-0.5 truncate">
                      Next: {nextEvent.title} · {format(new Date(nextEvent.startAt), 'MMM d')}
                    </p>
                  )}
                  {!nextEvent && (
                    <p className="text-xs text-ink-3 mt-0.5">No upcoming events</p>
                  )}
                </div>
                <button
                  onClick={() => onUnfollow(item.id, item.type)}
                  className="ml-3 shrink-0 text-sm px-3 py-1.5 bg-soft text-ink-2 rounded-lg hover:bg-[var(--color-divider)] transition-colors"
                >
                  Unfollow
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
