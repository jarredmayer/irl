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

// Category colors (triadic scheme from miami_events_scraper)
export const CATEGORY_COLORS: Record<string, { primary: string; secondary: string; emoji: string }> = {
  'Music': { primary: '#A68EFF', secondary: '#B8A3FF', emoji: '🎵' },
  'Arts & Culture': { primary: '#FF7864', secondary: '#FF9B8A', emoji: '🎨' },
  'Art': { primary: '#FF7864', secondary: '#FF9B8A', emoji: '🎨' },
  'Culture': { primary: '#FF7864', secondary: '#FF9B8A', emoji: '🏛️' },
  'Food & Drink': { primary: '#9BC178', secondary: '#B5D49A', emoji: '🍽️' },
  'Sports': { primary: '#4FD1C5', secondary: '#7FDBCD', emoji: '⚽' },
  'Comedy': { primary: '#E37C73', secondary: '#F19A92', emoji: '😂' },
  'Wellness': { primary: '#F3B567', secondary: '#F7C885', emoji: '🧘' },
  'Fitness': { primary: '#4FD1C5', secondary: '#7FDBCD', emoji: '💪' },
  'Outdoors': { primary: '#68D391', secondary: '#9AE6B4', emoji: '🌴' },
  'Nightlife': { primary: '#9F7AEA', secondary: '#B794F4', emoji: '🌙' },
  'Community': { primary: '#FC8181', secondary: '#FEB2B2', emoji: '🤝' },
  'Family': { primary: '#F6AD55', secondary: '#FBD38D', emoji: '👨‍👩‍👧' },
  'Other': { primary: '#A0AEC0', secondary: '#CBD5E0', emoji: '📅' },
};

// Editorial vibe tags (from miami_events_scraper)
export const VIBE_TAGS = [
  'nightlife',
  'daytime',
  'high-energy',
  'intimate',
  'wellness',
  'creative',
  'luxury',
  'underground',
  'community',
  'festival',
  'culinary',
  'cultural',
  'outdoor',
] as const;

export const VIBE_TAG_COLORS: Record<string, { primary: string; bg: string }> = {
  festival: { primary: '#FF4E88', bg: '#FF4E8815' },
  luxury: { primary: '#FFD700', bg: '#FFD70015' },
  underground: { primary: '#7B61FF', bg: '#7B61FF15' },
  wellness: { primary: '#A7F3D0', bg: '#A7F3D015' },
  nightlife: { primary: '#9F7AEA', bg: '#9F7AEA15' },
  daytime: { primary: '#F6AD55', bg: '#F6AD5515' },
  'high-energy': { primary: '#FC8181', bg: '#FC818115' },
  intimate: { primary: '#F687B3', bg: '#F687B315' },
  creative: { primary: '#63B3ED', bg: '#63B3ED15' },
  community: { primary: '#68D391', bg: '#68D39115' },
  culinary: { primary: '#9BC178', bg: '#9BC17815' },
  cultural: { primary: '#E37C73', bg: '#E37C7315' },
  outdoor: { primary: '#4FD1C5', bg: '#4FD1C515' },
};

export const TAGS = [
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

export const NEIGHBORHOODS = {
  Miami: [
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
  ],
  'Fort Lauderdale': [
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
  ],
} as const;

export const DEFAULT_PREFERENCES = {
  tags: [] as string[],
  radiusMiles: 10,
  transportMode: 'drive' as const,
};

export const DEFAULT_PROFILE = {
  handle: undefined,
  displayName: undefined,
  photoUrl: undefined,
};

export const DEFAULT_USER_STATE = {
  savedEventIds: [] as string[],
  following: [] as { id: string; type: 'venue' | 'series' | 'neighborhood' | 'organizer'; name: string; followedAt: number }[],
  preferences: DEFAULT_PREFERENCES,
  profile: DEFAULT_PROFILE,
  lastKnownLocation: undefined,
};


export const DEFAULT_FILTERS = {
  timeFilter: 'this-week' as const,
  selectedTags: [] as string[],
  selectedCategories: [] as string[],
  selectedNeighborhoods: [] as string[],
  nearMeOnly: false,
  city: undefined,
  searchQuery: '',
  priceRange: [0, 200] as [number, number],
  freeOnly: false,
  dateRange: ['', ''] as [string, string],
};

// Popular neighborhoods for quick filtering
export const POPULAR_NEIGHBORHOODS = [
  'Wynwood',
  'Brickell',
  'South Beach',
  'Design District',
  'Coconut Grove',
  'Little Havana',
  'Downtown Miami',
  'Coral Gables',
  'Las Olas',
  'Downtown FLL',
] as const;

// Miami city center for fallback
export const MIAMI_CENTER = {
  lat: 25.7617,
  lng: -80.1918,
};

// Fort Lauderdale center
export const FLL_CENTER = {
  lat: 26.1224,
  lng: -80.1373,
};

export const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export const STORAGE_KEYS = {
  USER_STATE: 'irl_user_state',
  WEATHER_CACHE: 'irl_weather_cache',
  USER_SUBMITTED_EVENTS: 'irl_user_submitted_events',
  USER_SUBMITTED_ACCOUNTS: 'irl_user_submitted_accounts',
} as const;

// Flat list of all neighborhoods for forms
export const ALL_NEIGHBORHOODS = [
  ...NEIGHBORHOODS.Miami,
  ...NEIGHBORHOODS['Fort Lauderdale'],
] as const;

export const TIME_SECTIONS = {
  TONIGHT: 'Tonight',
  TOMORROW: 'Tomorrow',
  THIS_WEEKEND: 'This Weekend',
  NEXT_WEEK: 'Next Week',
  WORTH_PLANNING: 'Worth Planning',
} as const;

export const WEATHER_CODES = {
  CLEAR: [0, 1],
  PARTLY_CLOUDY: [2, 3],
  FOGGY: [45, 48],
  DRIZZLE: [51, 53, 55, 56, 57],
  RAIN: [61, 63, 65, 66, 67, 80, 81, 82],
  SNOW: [71, 73, 75, 77, 85, 86],
  THUNDERSTORM: [95, 96, 99],
} as const;

export const PRECIPITATION_THRESHOLD = 40; // percent

export const MAX_PRICE = 200;
