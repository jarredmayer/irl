import { useState, useCallback, useMemo } from 'react';
import { LeadSection } from './LeadSection';
import { ListSection } from './ListSection';
import { NudgeSection } from './NudgeSection';
import { WildCardSection } from './WildCardSection';
import { ShareableCard } from './ShareableCard';
import { generateDeterministicCopy, type EditorialResult } from '../../agents';
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

  const categoryLower = event.category.toLowerCase();
  if (interests.some(i => categoryLower.includes(i.toLowerCase()) || i.toLowerCase().includes(categoryLower))) {
    boost += 30;
  }

  if (city && CITY_NEIGHBORHOODS[city]) {
    if (CITY_NEIGHBORHOODS[city].some(n =>
      event.neighborhood.toLowerCase().includes(n.toLowerCase()) ||
      n.toLowerCase().includes(event.neighborhood.toLowerCase())
    )) {
      boost += 20;
    }
  }

  if (vibes.some(v =>
    categoryLower.includes(v.toLowerCase()) ||
    event.tags.some(t => v.toLowerCase().includes(t.toLowerCase()))
  )) {
    boost += 15;
  }

  return boost;
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

  // Get user preferences — re-read on each render so changes are reflected
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

  // ─── SLOT-BASED CURATION ─────────────────────────────────
  const { leadEvent, listEvents, nudgeEvent, wildcardEvent } = useMemo(() => {
    const now = new Date();
    const usedIds = new Set<string>();
    const usedCategories = new Set<string>();

    // ── THE LEAD ──
    // Highest quality signal, must have image, prefer editor picks
    // Among candidates, prefer events matching user's top interest
    let lead: ScoredEvent | undefined;

    const withImage = boostedEvents.filter(e => e.image);
    const editorPicks = withImage.filter(e => e.editorPick);

    if (hasPreferences && editorPicks.length > 0) {
      lead = editorPicks.find(e =>
        interests.some(i => e.category.toLowerCase().includes(i.toLowerCase()))
      ) ?? editorPicks[0];
    } else if (editorPicks.length > 0) {
      lead = editorPicks[0];
    } else if (hasPreferences && withImage.length > 0) {
      lead = withImage.find(e =>
        interests.some(i => e.category.toLowerCase().includes(i.toLowerCase()))
      ) ?? withImage[0];
    } else {
      lead = withImage[0] ?? boostedEvents[0];
    }

    if (lead) {
      usedIds.add(lead.id);
      usedCategories.add(lead.category);
    }

    // ── THE LIST ──
    // 3 events, category-diverse — no two should share a category
    // Round-robin through user's interest categories, exclude Lead's category
    const list: ScoredEvent[] = [];
    const listCategories = new Set<string>();
    const available = boostedEvents.filter(e => !usedIds.has(e.id));

    if (hasPreferences) {
      const interestCategories = interests.filter(
        i => !usedCategories.has(i) && i.toLowerCase() !== lead?.category.toLowerCase()
      );

      for (const interest of interestCategories) {
        if (list.length >= 3) break;
        const match = available.find(e =>
          !usedIds.has(e.id) &&
          !listCategories.has(e.category) &&
          e.category.toLowerCase().includes(interest.toLowerCase())
        );
        if (match) {
          list.push(match);
          usedIds.add(match.id);
          listCategories.add(match.category);
          usedCategories.add(match.category);
        }
      }
    }

    // Fill remaining slots from underrepresented categories
    if (list.length < 3) {
      const catCounts = new Map<string, number>();
      for (const e of boostedEvents) {
        catCounts.set(e.category, (catCounts.get(e.category) || 0) + 1);
      }

      const remaining = available
        .filter(e => !usedIds.has(e.id) && !listCategories.has(e.category))
        .sort((a, b) => (catCounts.get(a.category) || 0) - (catCounts.get(b.category) || 0));

      for (const event of remaining) {
        if (list.length >= 3) break;
        if (!listCategories.has(event.category)) {
          list.push(event);
          usedIds.add(event.id);
          listCategories.add(event.category);
          usedCategories.add(event.category);
        }
      }
    }

    // If still not enough, fill with any available
    if (list.length < 3) {
      const fallbacks = available.filter(e => !usedIds.has(e.id));
      for (const event of fallbacks) {
        if (list.length >= 3) break;
        list.push(event);
        usedIds.add(event.id);
        usedCategories.add(event.category);
      }
    }

    // ── THE NUDGE ──
    // Soonest event within 24h, must not duplicate a used category
    let nudge: ScoredEvent | undefined;

    const nudgeCandidates24 = boostedEvents.filter(e => {
      if (usedIds.has(e.id)) return false;
      const eventDate = new Date(e.startAt);
      const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntil > 0 && hoursUntil <= 24 && !usedCategories.has(e.category);
    }).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    nudge = nudgeCandidates24[0];

    if (!nudge) {
      const nudgeCandidates48 = boostedEvents.filter(e => {
        if (usedIds.has(e.id)) return false;
        const eventDate = new Date(e.startAt);
        const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntil > 0 && hoursUntil <= 48 && !usedCategories.has(e.category);
      }).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

      nudge = nudgeCandidates48[0];
    }

    if (!nudge) {
      nudge = boostedEvents
        .filter(e => !usedIds.has(e.id) && new Date(e.startAt) > now)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
    }

    if (nudge) {
      usedIds.add(nudge.id);
      usedCategories.add(nudge.category);
    }

    // ── THE WILD CARD ──
    // Intentionally pick something the user WOULDN'T normally see
    let wildCard: ScoredEvent | undefined;

    const unusedCategoryEvents = boostedEvents.filter(e =>
      !usedIds.has(e.id) && !usedCategories.has(e.category)
    );

    if (unusedCategoryEvents.length > 0) {
      const userNeighborhoods = city ? (CITY_NEIGHBORHOODS[city] || []) : [];
      const unexploredEvents = unusedCategoryEvents.filter(e =>
        !userNeighborhoods.some(n =>
          e.neighborhood.toLowerCase().includes(n.toLowerCase())
        )
      );

      const candidates = unexploredEvents.length > 0 ? unexploredEvents : unusedCategoryEvents;
      // Pick lowest score for maximum surprise
      wildCard = candidates[candidates.length - 1] ?? candidates[0];
    } else {
      const remainingEvents = boostedEvents.filter(e => !usedIds.has(e.id));

      if (hasPreferences && interests.length > 0) {
        const lowestInterest = interests[interests.length - 1];
        wildCard = remainingEvents.find(e =>
          e.category.toLowerCase().includes(lowestInterest.toLowerCase())
        );
      }

      if (!wildCard) {
        wildCard = remainingEvents[remainingEvents.length - 1] ?? remainingEvents[0];
      }
    }

    return {
      leadEvent: lead,
      listEvents: list,
      nudgeEvent: nudge,
      wildcardEvent: wildCard,
    };
  }, [boostedEvents, interests, city, hasPreferences]);

  // ─── EDITORIAL COPY ──────────────────────────────────────
  // Deterministic, reactive to events + preferences
  const copy: EditorialResult = useMemo(() => {
    return generateDeterministicCopy({
      lead: leadEvent,
      list: listEvents,
      nudge: nudgeEvent,
      wildCard: wildcardEvent,
    });
  }, [leadEvent, listEvents, nudgeEvent, wildcardEvent]);

  const handleShare = useCallback(() => {
    setShowShareCard(true);
  }, []);

  const handleCloseShare = useCallback(() => {
    setShowShareCard(false);
  }, []);

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
          {copy.headline}
        </h1>

        {/* Subtitle */}
        <p className="text-ink-2 text-[14px] font-light leading-relaxed">
          {copy.subhead}
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
          leadIntro={copy.leadIntro}
        />
      )}

      {/* THE LIST */}
      {listEvents.length > 0 && (
        <ListSection
          events={listEvents}
          title="THIS WEEKEND"
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
          wildCardLabel={copy.wildCardLabel}
        />
      )}

      {/* Shareable Card Modal */}
      {showShareCard && (
        <ShareableCard
          headline={copy.headline}
          events={[leadEvent, ...listEvents.slice(0, 2)].filter(Boolean) as ScoredEvent[]}
          weekLabel={getWeekLabel()}
          onClose={handleCloseShare}
        />
      )}
    </div>
  );
}
