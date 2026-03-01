import { useState } from 'react';
import { EventCard } from '../feed/EventCard';
import { EmptyState } from '../ui/EmptyState';
import { format } from 'date-fns';
import type { ScoredEvent, FollowItem, FollowType } from '../../types';

interface FollowingViewProps {
  events: ScoredEvent[];
  following: FollowItem[];
  onUnfollow: (id: string, type: FollowType) => void;
  onFollow: (id: string, type: FollowType, name: string) => void;
  followingVenueIds: string[];
  followingSeriesIds: string[];
  followingNeighborhoods: string[];
}

type TabType = 'events' | 'following';

export function FollowingView({
  events,
  following,
  onUnfollow,
  onFollow,
  followingVenueIds,
  followingSeriesIds,
  followingNeighborhoods,
}: FollowingViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('events');

  const groupedFollowing = {
    venue: following.filter((f) => f.type === 'venue'),
    series: following.filter((f) => f.type === 'series'),
    neighborhood: following.filter((f) => f.type === 'neighborhood'),
    organizer: following.filter((f) => f.type === 'organizer'),
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-[52px] z-20 bg-white border-b border-slate-100">
        <div className="px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('events')}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'events'
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Events ({events.length})
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'following'
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Following ({following.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'events' ? (
        events.length === 0 ? (
          <EmptyState
            title="No events from followed"
            description="Follow venues, series, or neighborhoods to see their events here."
            icon={
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            }
          />
        ) : (
          <div className="px-4 py-4 space-y-3">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onFollow={onFollow}
                isFollowingVenue={event.venueId ? followingVenueIds.includes(event.venueId) : false}
                isFollowingSeries={event.seriesId ? followingSeriesIds.includes(event.seriesId) : false}
                isFollowingNeighborhood={followingNeighborhoods.includes(event.neighborhood)}
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
              allEvents={events}
              onUnfollow={onUnfollow}
              emoji="📍"
              getEventIds={(item) => events.filter(e => e.venueId === item.id).map(e => e.id)}
            />
          )}
          {groupedFollowing.series.length > 0 && (
            <FollowSection
              title="Series"
              items={groupedFollowing.series}
              allEvents={events}
              onUnfollow={onUnfollow}
              emoji="🔁"
              getEventIds={(item) => events.filter(e => e.seriesId === item.id).map(e => e.id)}
            />
          )}
          {groupedFollowing.neighborhood.length > 0 && (
            <FollowSection
              title="Neighborhoods"
              items={groupedFollowing.neighborhood}
              allEvents={events}
              onUnfollow={onUnfollow}
              emoji="🏘️"
              getEventIds={(item) => events.filter(e => e.neighborhood === item.id).map(e => e.id)}
            />
          )}
          {groupedFollowing.organizer.length > 0 && (
            <FollowSection
              title="Organizers"
              items={groupedFollowing.organizer}
              allEvents={events}
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
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
        <span>{emoji}</span>
        <span>{title}</span>
        <span className="text-slate-400">({items.length})</span>
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
              className="bg-white rounded-xl border border-slate-100 overflow-hidden"
            >
              <div className="flex items-center justify-between p-3">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-800">{item.name}</span>
                  {itemEvents.length > 0 && (
                    <span className="ml-2 text-xs text-sky-600 font-medium">
                      {itemEvents.length} upcoming
                    </span>
                  )}
                  {nextEvent && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      Next: {nextEvent.title} · {format(new Date(nextEvent.startAt), 'MMM d')}
                    </p>
                  )}
                  {!nextEvent && (
                    <p className="text-xs text-slate-400 mt-0.5">No upcoming events</p>
                  )}
                </div>
                <button
                  onClick={() => onUnfollow(item.id, item.type)}
                  className="ml-3 shrink-0 text-sm px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
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
