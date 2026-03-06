import { useState, useCallback, useEffect } from 'react';
import { LeadSection } from './LeadSection';
import { ListSection } from './ListSection';
import { NudgeSection } from './NudgeSection';
import { WildCardSection } from './WildCardSection';
import { ShareableCard } from './ShareableCard';
import { getYourcastEditorial, type YourcastEditorial } from '../../agents';
import type { ScoredEvent, FollowType } from '../../types';

interface YourcastViewProps {
  events: ScoredEvent[];
  onFollow?: (id: string, type: FollowType, name: string) => void;
  followingVenueIds?: string[];
  followingSeriesIds?: string[];
  followingNeighborhoods?: string[];
  savedEventIds?: string[];
  onSaveEvent?: (eventId: string) => void;
}

// Mustard color from spec
const MUSTARD = '#C4A040';

// Get list title based on theme
function getListTitle(theme?: string): string {
  switch (theme) {
    case 'sunny_weekend':
      return 'SUNNY THIS WEEKEND';
    case 'rainy_indoor':
      return 'STAY DRY THIS WEEKEND';
    case 'arts_week':
      return 'ART FORWARD';
    case 'nightlife_forward':
      return 'AFTER DARK';
    case 'outdoor_explorer':
      return 'GET OUTSIDE';
    case 'mixed':
    default:
      return 'THIS WEEKEND';
  }
}

export function YourcastView({
  events,
  onFollow,
  followingVenueIds = [],
  followingSeriesIds = [],
  followingNeighborhoods = [],
  savedEventIds = [],
  onSaveEvent,
}: YourcastViewProps) {
  const [showShareCard, setShowShareCard] = useState(false);
  const [editorial, setEditorial] = useState<YourcastEditorial | null>(null);
  const [, setIsLoadingEditorial] = useState(true);

  // Fetch editorial content on mount
  useEffect(() => {
    async function loadEditorial() {
      if (events.length === 0) {
        setIsLoadingEditorial(false);
        return;
      }

      try {
        const content = await getYourcastEditorial(events);
        setEditorial(content);
      } catch (error) {
        console.error('Failed to load editorial:', error);
      } finally {
        setIsLoadingEditorial(false);
      }
    }

    loadEditorial();
  }, [events]);

  // Use editorial content or fallback
  const headline = editorial?.headline || "A good week to be outside.";
  const subtitle = editorial?.subheadline || "Three art-forward picks, one long lunch, and a waterfront walk — all within 15 minutes.";

  // Select events for each section (using simple logic for now)
  // THE LEAD: First event with an image and editor pick, or highest ranked
  const leadEvent = events.find(e => e.image && e.editorPick) || events.find(e => e.image) || events[0];

  // THE LIST: Next 3-5 events (excluding lead)
  const listEvents = events.filter(e => e.id !== leadEvent?.id).slice(0, 4);

  // THE NUDGE: Find an event happening soon (within 24 hours)
  const now = new Date();
  const nudgeEvent = events.find(e => {
    if (e.id === leadEvent?.id) return false;
    const eventDate = new Date(e.startAt);
    const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil > 0 && hoursUntil <= 24;
  }) || events.find(e => e.id !== leadEvent?.id);

  // THE WILD CARD: Pick something from a less common category or neighborhood
  const wildcardEvent = events.find(e => {
    if (e.id === leadEvent?.id || e.id === nudgeEvent?.id) return false;
    // Look for underground/niche tags or less common categories
    return e.tags.some(t => ['underground', 'pop-up', 'new-opening', 'niche'].includes(t));
  }) || events.find(e => e.id !== leadEvent?.id && e.id !== nudgeEvent?.id);

  const handleShare = useCallback(() => {
    setShowShareCard(true);
  }, []);

  const handleCloseShare = useCallback(() => {
    setShowShareCard(false);
  }, []);

  // Get current week label
  const getWeekLabel = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('en-US', options)} – ${end.toLocaleDateString('en-US', options)}`;
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        {/* Share button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors btn-press"
            style={{ backgroundColor: MUSTARD + '18', color: MUSTARD }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
            </svg>
            Share My Yourcast
          </button>
        </div>

        {/* YOURCAST label */}
        <p
          className="text-[11px] font-bold uppercase mb-2"
          style={{ color: MUSTARD, letterSpacing: '0.14em' }}
        >
          YOURCAST
        </p>

        {/* Editorial headline */}
        <h1 className="font-serif text-[28px] text-ink leading-snug mb-3 italic">
          {headline}
        </h1>

        {/* Subtitle */}
        <p className="text-ink-2 text-[14px] font-light leading-relaxed">
          {subtitle}
        </p>

        {/* Week label */}
        <p className="text-xs text-ink-3 mt-4 uppercase tracking-wider">
          {getWeekLabel()}
        </p>
      </div>

      {/* THE LEAD */}
      {leadEvent && (
        <LeadSection
          event={leadEvent}
          isSaved={savedEventIds.includes(leadEvent.id)}
          onSave={onSaveEvent}
        />
      )}

      {/* THE LIST */}
      {listEvents.length > 0 && (
        <ListSection
          events={listEvents}
          title={getListTitle(editorial?.yourcast_theme)}
          savedEventIds={savedEventIds}
          onSaveEvent={onSaveEvent}
          onFollow={onFollow}
          followingVenueIds={followingVenueIds}
          followingSeriesIds={followingSeriesIds}
          followingNeighborhoods={followingNeighborhoods}
        />
      )}

      {/* THE NUDGE */}
      {nudgeEvent && (
        <NudgeSection
          event={nudgeEvent}
          isSaved={savedEventIds.includes(nudgeEvent.id)}
          onSave={onSaveEvent}
        />
      )}

      {/* THE WILD CARD */}
      {wildcardEvent && (
        <WildCardSection
          event={wildcardEvent}
          isSaved={savedEventIds.includes(wildcardEvent.id)}
          onSave={onSaveEvent}
          onFollow={onFollow}
          isFollowingVenue={wildcardEvent.venueId ? followingVenueIds.includes(wildcardEvent.venueId) : false}
          isFollowingSeries={wildcardEvent.seriesId ? followingSeriesIds.includes(wildcardEvent.seriesId) : false}
          isFollowingNeighborhood={followingNeighborhoods.includes(wildcardEvent.neighborhood)}
        />
      )}

      {/* Shareable Card Modal */}
      {showShareCard && (
        <ShareableCard
          headline={headline}
          events={[leadEvent, ...listEvents.slice(0, 2)].filter(Boolean) as ScoredEvent[]}
          weekLabel={getWeekLabel()}
          onClose={handleCloseShare}
        />
      )}
    </div>
  );
}
