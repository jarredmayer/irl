import { useState, useCallback, useEffect, useMemo } from 'react';
import { LeadSection } from './LeadSection';
import { ListSection } from './ListSection';
import { NudgeSection } from './NudgeSection';
import { WildCardSection } from './WildCardSection';
import { ShareableCard } from './ShareableCard';
import { getYourcastEditorial, type YourcastEditorial } from '../../agents';
import { getPreferences } from '../../store/preferences';
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

// City to neighborhood mapping for location boost
const CITY_NEIGHBORHOODS: Record<string, string[]> = {
  miami: ['Wynwood', 'Brickell', 'Downtown', 'Little Havana', 'Coconut Grove', 'Design District', 'South Beach', 'Midtown', 'Edgewater', 'Little Haiti'],
  ftl: ['Las Olas', 'Downtown Fort Lauderdale', 'Riverwalk', 'Victoria Park', 'Wilton Manors'],
  pb: ['West Palm Beach', 'Downtown West Palm Beach', 'Palm Beach', 'Delray Beach', 'Boca Raton'],
};

// Apply preference-based boost to event scoring
function applyPreferenceBoost(
  event: ScoredEvent,
  interests: string[],
  vibes: string[],
  city: string | null
): number {
  let boost = 0;

  // Category matches interest: +30 points
  const categoryLower = event.category.toLowerCase();
  if (interests.some(i => categoryLower.includes(i.toLowerCase()) || i.toLowerCase().includes(categoryLower))) {
    boost += 30;
  }

  // Location/neighborhood matches city anchor: +20 points
  if (city && CITY_NEIGHBORHOODS[city]) {
    if (CITY_NEIGHBORHOODS[city].some(n =>
      event.neighborhood.toLowerCase().includes(n.toLowerCase()) ||
      n.toLowerCase().includes(event.neighborhood.toLowerCase())
    )) {
      boost += 20;
    }
  }

  // Category matches a vibe directly: +15 points
  if (vibes.some(v =>
    categoryLower.includes(v.toLowerCase()) ||
    event.tags.some(t => v.toLowerCase().includes(t.toLowerCase()))
  )) {
    boost += 15;
  }

  return boost;
}

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

  // Get user preferences for boosting
  const { interests, city, vibes } = getPreferences();
  const hasPreferences = interests.length > 0 || vibes.length > 0;

  // Apply preference boosts and re-rank events
  const boostedEvents = useMemo(() => {
    if (!hasPreferences) return events;

    return [...events]
      .map(event => ({
        event,
        boostedScore: (event.score || 0) + applyPreferenceBoost(event, interests, vibes, city),
      }))
      .sort((a, b) => b.boostedScore - a.boostedScore)
      .map(({ event }) => event);
  }, [events, interests, vibes, city, hasPreferences]);

  // THE LEAD: Highest boosted score event with an image
  const leadEvent = boostedEvents.find(e => e.image && e.editorPick)
    || boostedEvents.find(e => e.image)
    || boostedEvents[0];

  // THE LIST: Next 3 events by boosted score, filtered by interests if possible
  const listEvents = useMemo(() => {
    const filtered = boostedEvents.filter(e => e.id !== leadEvent?.id);
    if (hasPreferences) {
      // Prefer events matching interests
      const matchingInterests = filtered.filter(e =>
        interests.some(i =>
          e.category.toLowerCase().includes(i.toLowerCase())
        )
      );
      if (matchingInterests.length >= 3) {
        return matchingInterests.slice(0, 3);
      }
    }
    return filtered.slice(0, 3);
  }, [boostedEvents, leadEvent, interests, hasPreferences]);

  // THE NUDGE: Soonest upcoming event matching any interest
  const now = new Date();
  const nudgeEvent = useMemo(() => {
    const usedIds = new Set([leadEvent?.id, ...listEvents.map(e => e.id)]);
    const upcoming = boostedEvents.filter(e => {
      if (usedIds.has(e.id)) return false;
      const eventDate = new Date(e.startAt);
      const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntil > 0 && hoursUntil <= 48;
    });

    // Prefer events matching interests
    if (hasPreferences) {
      const matching = upcoming.find(e =>
        interests.some(i => e.category.toLowerCase().includes(i.toLowerCase()))
      );
      if (matching) return matching;
    }

    return upcoming[0] || boostedEvents.find(e => !usedIds.has(e.id));
  }, [boostedEvents, leadEvent, listEvents, interests, hasPreferences, now]);

  // THE WILD CARD: Lowest-profile event matching any interest, tagged "under the radar"
  const wildcardEvent = useMemo(() => {
    const usedIds = new Set([leadEvent?.id, nudgeEvent?.id, ...listEvents.map(e => e.id)]);
    const available = boostedEvents.filter(e => !usedIds.has(e.id));

    // Look for underground/niche events matching interests
    const niche = available.filter(e =>
      e.tags.some(t => ['underground', 'pop-up', 'new-opening', 'niche', 'local-favorite'].includes(t))
    );

    if (hasPreferences && niche.length > 0) {
      const matching = niche.find(e =>
        interests.some(i => e.category.toLowerCase().includes(i.toLowerCase()))
      );
      if (matching) return matching;
    }

    return niche[0] || available[available.length - 1] || available[0];
  }, [boostedEvents, leadEvent, nudgeEvent, listEvents, interests, hasPreferences]);

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
