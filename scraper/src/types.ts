/**
 * IRL Scraper Type Definitions
 */

// Curation and quality types
export type IndoorOutdoor = 'indoor' | 'outdoor' | 'both' | 'unknown';
export type ImageTier = 'hero' | 'card' | 'none';
export type TrustTier = 'high' | 'medium' | 'low';
export type ImageSource = 'venue' | 'event' | 'organizer' | 'stock' | 'generated' | 'none';

// Raw event from scrapers (intermediate format)
export interface RawEvent {
  title: string;
  startAt: string; // ISO 8601
  endAt?: string;
  venueName?: string;
  address?: string;
  neighborhood?: string;
  lat?: number | null;
  lng?: number | null;
  city: 'Miami' | 'Fort Lauderdale' | 'Palm Beach';
  tags: string[];
  category: string;
  priceLabel?: 'Free' | '$' | '$$' | '$$$';
  priceAmount?: number;
  isOutdoor: boolean;
  description: string;
  sourceUrl?: string;
  sourceName: string;
  ticketUrl?: string;
  image?: string;
  recurring?: boolean;
  recurrencePattern?: string;
  // Phase 4 curation fields
  indoorOutdoor?: IndoorOutdoor;
  imageSource?: ImageSource;
  vibeTags?: string[];
}

// Final event format matching IRL app schema
export interface IRLEvent {
  id: string;
  title: string;
  startAt: string;
  endAt?: string;
  timezone: string;
  venueName?: string;
  address?: string;
  neighborhood: string;
  lat: number | null;
  lng: number | null;
  city: 'Miami' | 'Fort Lauderdale' | 'Palm Beach';
  tags: string[];
  category: string;
  priceLabel?: 'Free' | '$' | '$$' | '$$$';
  priceAmount?: number;
  ticketUrl?: string;
  isOutdoor: boolean;
  shortWhy: string;
  editorialWhy: string;
  description: string;
  source?: {
    name: string;
    url: string;
  };
  image?: string;
  editorPick?: boolean;
  seriesId?: string;
  seriesName?: string;
  venueId?: string;
  addedAt?: string; // ISO 8601 — when this event first appeared in the feed
  // Phase 4 curation fields
  indoorOutdoor: IndoorOutdoor;
  imageSource?: ImageSource;
  imageTier: ImageTier;
  completenessScore: number; // 0-100
  freshnessScore: number; // 0-100
  trustTier: TrustTier;
  sourceUrl?: string;
  lastVerified?: string; // ISO 8601
  vibeTags: string[];
}

// Source configuration
export interface SourceConfig {
  name: string;
  enabled: boolean;
  weight: number; // Higher = more trusted
  rateLimit: number; // ms between requests
}

// Scraper result
export interface ScrapeResult {
  source: string;
  events: RawEvent[];
  errors: string[];
  scrapedAt: string;
}

// Miami neighborhoods for validation
export const MIAMI_NEIGHBORHOODS = [
  'Wynwood',
  'Brickell',
  'Design District',
  'South Beach',
  'Coconut Grove',
  'Little Havana',
  'Midtown',
  'Downtown Miami',
  'Edgewater',
  'Coral Gables',
  'Key Biscayne',
  'Little Haiti',
  'Allapattah',
  'Overtown',
  'Little River',
  'North Miami',
  'Mid-Beach',
  'Surfside',
  'Miami Beach',
  'Pinecrest',
  'Miami Gardens',
] as const;

export const FLL_NEIGHBORHOODS = [
  'Las Olas',
  'Downtown FLL',
  'Fort Lauderdale Beach',
  'Flagler Village',
  'Victoria Park',
  'Wilton Manors',
  'Harbor Beach',
  'Rio Vista',
  'Lauderdale-By-The-Sea',
  'Oakland Park',
] as const;

// Event categories
export const CATEGORIES = [
  'Food & Drink',
  'Music',
  'Culture',
  'Fitness',
  'Outdoors',
  'Nightlife',
  'Art',
  'Community',
  'Sports',
  'Wellness',
  'Comedy',
  'Family',
] as const;

// Tags for events
export const VALID_TAGS = [
  'live-music',
  'dj',
  'happy-hour',
  'brunch',
  'rooftop',
  'waterfront',
  'art-gallery',
  'museum',
  'theater',
  'comedy',
  'yoga',
  'running',
  'cycling',
  'beach',
  'park',
  'food-market',
  'wine-tasting',
  'craft-beer',
  'cocktails',
  'dancing',
  'latin',
  'jazz',
  'electronic',
  'hip-hop',
  'indie',
  'pop-up',
  'outdoor-dining',
  'sunset',
  'sunrise',
  'family-friendly',
  'dog-friendly',
  'free-event',
  'networking',
  'workshop',
  'fitness-class',
  'meditation',
  'local-favorite',
  'new-opening',
  'seasonal',
] as const;

// Vibe tags for curation scoring
export const VIBE_TAGS = [
  'chill',
  'energetic',
  'intimate',
  'crowded',
  'upscale',
  'casual',
  'artsy',
  'trendy',
  'underground',
  'mainstream',
  'romantic',
  'social',
  'solo-friendly',
  'date-night',
  'girls-night',
  'day-party',
  'late-night',
  'morning',
  'afternoon',
  'sunset-vibes',
  'boozy',
  'sober-friendly',
  'loud',
  'quiet',
  'scenic',
  'hidden-gem',
  'instagrammable',
  'locals-only',
  'tourist-friendly',
] as const;

export type VibeTag = typeof VIBE_TAGS[number];
