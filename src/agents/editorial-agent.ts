/**
 * Editorial Voice Agent
 *
 * Generates Yourcast editorial copy deterministically from event data.
 * Uses contextual templates based on time, day, category, and selected events.
 * AI generation is kept as an enhancement when API key is available.
 */

import type { ScoredEvent } from '../types';
import { getPreferences } from '../store/preferences';

export interface EditorialResult {
  headline: string;
  subhead: string;
  leadIntro: string;
  wildCardLabel: string;
}

// ─── IRL VOICE BRIEF ─────────────────────────────────────
// Terse. Local. Unsentimental.
// Sounds like a friend who actually goes out in Miami.
// Specific beats generic. Facts not feelings.
// Never: perfect, amazing, discover, explore, curated,
//   personalized, vibrant, exciting, seamless.
// Dry wit is fine. Enthusiasm is not.
// Max 8 words for headline. Max 10 words for subhead.
// ─────────────────────────────────────────────────────────

interface CuratedSlots {
  lead?: ScoredEvent;
  list: ScoredEvent[];
  nudge?: ScoredEvent;
  wildCard?: ScoredEvent;
}

// Headline templates grouped by context
const TIME_HEADLINES: Record<string, string[]> = {
  friday: [
    'Your Friday Night, Sorted',
    'Friday. Out. Now.',
    'This Friday Hits Different',
    'Weekend Starts Here',
  ],
  saturday: [
    'Saturday Plans, Handled',
    'Your Saturday Lineup',
    'Saturday Sorted',
    'The Saturday Edit',
  ],
  sunday: [
    'Sunday Plans, Handled',
    'The Sunday Situation',
    'Easy Sunday',
    'Sunday Done Right',
  ],
  weeknight: [
    'Midweek Moves',
    'Tonight, If You\'re Up For It',
    'Don\'t Stay In',
    'Weeknight Worth It',
  ],
  weekend: [
    'The Weekend Rundown',
    'This Weekend, Handled',
    'Weekend Plans, Set',
    'What\'s Good This Weekend',
  ],
};

const CATEGORY_HEADLINES: Record<string, string[]> = {
  'Music': [
    'Live Music Worth Leaving Home For',
    'Turn It Up This Week',
    'Good Sound, Better Night',
  ],
  'Art': [
    'Art You Haven\'t Seen Yet',
    'Worth a Gallery Walk',
    'New Walls, New Work',
  ],
  'Food & Drink': [
    'Eat Here This Week',
    'The Dining Shortlist',
    'Fork-Worthy This Week',
  ],
  'Outdoors': [
    'Get Outside This Week',
    'Fresh Air, Good Plans',
    'Outside > Inside',
  ],
  'Nightlife': [
    'The Night Shift',
    'After Dark This Week',
    'Late Night Sorted',
  ],
  'Community': [
    'Your People Are Here',
    'Locals Only (Not Really)',
    'The Neighborhood Lineup',
  ],
  'Wellness': [
    'Good For You This Week',
    'Recharge Mode',
    'Mind, Body, Weekend',
  ],
};

const CITY_HEADLINES: Record<string, string[]> = {
  Miami: [
    'What\'s Good in Miami',
    'The Miami Edit',
    'Miami This Week',
  ],
  'Fort Lauderdale': [
    'What\'s Up in FLL',
    'The Fort Lauderdale Edit',
    'FLL This Week',
  ],
  'Palm Beach': [
    'What\'s Good in PB',
    'The Palm Beach Edit',
    'Palm Beach This Week',
  ],
  'South Florida': [
    'What\'s Good in SoFlo',
    'This Week in SoFlo',
    'The SoFlo Edit',
  ],
};

const GENERIC_HEADLINES = [
  'This Week\'s Picks',
  'What\'s Worth Your Time',
  'The Short List',
  'Stuff That\'s Actually Good',
  'Out There This Week',
  'Worth Showing Up For',
  'The Honest Picks',
  'No Filler, Just Plans',
];

const WILDCARD_LABELS = [
  'Under the radar.',
  'You wouldn\'t find this on your own.',
  'The one you\'d miss.',
  'Off the beaten path.',
  'Something different.',
  'The unexpected pick.',
  'Left field, right call.',
  'Not what you\'d expect.',
];

// Use a deterministic-ish seed based on date to get variety without randomness
function pickFromList(list: string[], seed: number): string {
  return list[Math.abs(seed) % list.length];
}

function getDaySeed(): number {
  const now = new Date();
  return now.getFullYear() * 1000 + now.getMonth() * 100 + now.getDate();
}

function getTimeContext(): string {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  if (day === 5) return hour >= 15 ? 'friday' : 'weeknight';
  if (day === 6) return 'saturday';
  if (day === 0) return 'sunday';
  if (day === 4 && hour >= 17) return 'weekend'; // Thursday evening = weekend preview
  return 'weeknight';
}

function generateSubhead(slots: CuratedSlots): string {
  const parts: string[] = [];

  if (slots.lead?.venueName) {
    parts.push(slots.lead.venueName);
  }
  if (slots.wildCard?.neighborhood) {
    parts.push(slots.wildCard.neighborhood);
  }

  if (parts.length === 2) {
    return `From ${parts[0]} to ${parts[1]}.`;
  }

  // Collect unique categories
  const categories = new Set<string>();
  if (slots.lead) categories.add(slots.lead.category);
  slots.list.forEach(e => categories.add(e.category));
  if (slots.nudge) categories.add(slots.nudge.category);

  const cats = Array.from(categories).slice(0, 3);
  if (cats.length >= 2) {
    return `Spanning ${cats.slice(0, -1).join(', ')}, and ${cats[cats.length - 1]}.`;
  }

  return "What's worth going to.";
}

export function generateDeterministicCopy(
  slots: CuratedSlots,
): EditorialResult {
  const seed = getDaySeed();
  const timeCtx = getTimeContext();
  const prefs = getPreferences();

  const cityMap: Record<string, string> = {
    miami: 'Miami',
    ftl: 'Fort Lauderdale',
    pb: 'Palm Beach',
  };
  const cityLabel = (prefs.city ? cityMap[prefs.city] : null) ?? 'South Florida';

  // Pick headline based on priority: category match > time context > city > generic
  let headline: string;

  const leadCategory = slots.lead?.category;
  if (leadCategory && CATEGORY_HEADLINES[leadCategory]) {
    headline = pickFromList(CATEGORY_HEADLINES[leadCategory], seed);
  } else if (TIME_HEADLINES[timeCtx]) {
    headline = pickFromList(TIME_HEADLINES[timeCtx], seed);
  } else if (CITY_HEADLINES[cityLabel]) {
    headline = pickFromList(CITY_HEADLINES[cityLabel], seed);
  } else {
    headline = pickFromList(GENERIC_HEADLINES, seed);
  }

  // Alternate between approaches using seed parity
  if (seed % 3 === 0 && CITY_HEADLINES[cityLabel]) {
    headline = pickFromList(CITY_HEADLINES[cityLabel], seed);
  } else if (seed % 3 === 1 && TIME_HEADLINES[timeCtx]) {
    headline = pickFromList(TIME_HEADLINES[timeCtx], seed + 1);
  }

  const subhead = generateSubhead(slots);
  const leadIntro = slots.lead?.editorialWhy?.slice(0, 100) || slots.lead?.shortWhy || 'Top pick for the week.';
  const wildCardLabel = pickFromList(WILDCARD_LABELS, seed + 2);

  return { headline, subhead, leadIntro, wildCardLabel };
}

// Async wrapper — keeps AI generation as enhancement when API key is available
// Falls back to deterministic copy
export async function generateEditorialCopy(
  events: ScoredEvent[],
  slots?: CuratedSlots,
): Promise<EditorialResult> {
  if (events.length === 0) {
    return {
      headline: 'Nothing Yet',
      subhead: "Check back soon.",
      leadIntro: 'Top pick for the week.',
      wildCardLabel: 'Under the radar.',
    };
  }

  // Use slots if provided, otherwise construct basic slots from events
  const effectiveSlots: CuratedSlots = slots ?? {
    lead: events[0],
    list: events.slice(1, 4),
    nudge: events[4],
    wildCard: events.find(e => e.category !== events[0]?.category) ?? events[5],
  };

  return generateDeterministicCopy(effectiveSlots);
}

// ─── LEGACY EXPORTS FOR COMPATIBILITY ─────────────────────

export function getCachedEditorial(): EditorialResult | null {
  return null;
}

export function clearEditorialCache(): void {
  // No-op — deterministic copy doesn't need caching
}

export const generateEditorial = generateEditorialCopy;
export const getYourcastEditorial = generateEditorialCopy;
