export type City = 'Miami' | 'Fort Lauderdale';

export type PriceLabel = 'Free' | '$' | '$$' | '$$$';

export type TransportMode = 'walk' | 'drive';

export type FollowType = 'venue' | 'series' | 'neighborhood' | 'organizer';

export interface EventSource {
  name: string;
  url: string;
}

export interface Event {
  id: string;
  title: string;
  startAt: string; // ISO 8601
  endAt?: string; // ISO 8601
  timezone: string; // Default: "America/New_York"
  venueName?: string;
  venueId?: string; // For following venues
  address?: string;
  neighborhood: string;
  lat: number | null;
  lng: number | null;
  city: City;
  tags: string[];
  category: string;
  priceLabel?: PriceLabel;
  price?: number; // Actual price in dollars
  ticketUrl?: string; // Link to buy tickets
  isOutdoor: boolean;
  shortWhy: string; // 1-line hook
  editorialWhy: string; // 2-5 lines
  description: string;
  source?: EventSource;
  image?: string;
  editorPick?: boolean;
  // Recurring event fields
  seriesId?: string; // For following a recurring series
  seriesName?: string;
  isRecurring?: boolean;
  organizerId?: string;
  organizerName?: string;
}

export interface FollowItem {
  id: string;
  type: FollowType;
  name: string;
  followedAt: number;
}

export interface UserProfile {
  handle?: string;
  displayName?: string;
  photoUrl?: string;
}

export interface UserPreferences {
  tags: string[];
  radiusMiles: number;
  transportMode: TransportMode;
}

export interface UserLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface UserState {
  savedEventIds: string[];
  following: FollowItem[];
  preferences: UserPreferences;
  profile: UserProfile;
  lastKnownLocation?: UserLocation;
}

export interface WeatherData {
  temperature: number;
  precipitationProbability: number;
  weatherCode: number;
  isDay: boolean;
}

export interface HourlyWeather {
  time: string;
  temperature: number;
  precipitationProbability: number;
  weatherCode: number;
}

export interface WeatherForecast {
  current: WeatherData;
  hourly: HourlyWeather[];
  sunset: string;
  fetchedAt: number;
}

export interface RankingContext {
  location?: UserLocation;
  preferences: UserPreferences;
  weather?: WeatherForecast;
  now: Date;
}

export interface ScoredEvent extends Event {
  score: number;
  distanceMiles?: number;
  weatherAtEvent?: HourlyWeather;
}

export type TimeFilter = 'today' | 'tomorrow' | 'this-week' | 'weekend' | 'all';

export interface FilterState {
  timeFilter: TimeFilter;
  selectedTags: string[];
  nearMeOnly: boolean;
  city?: City;
  searchQuery: string;
  priceRange: [number, number]; // [min, max]
  freeOnly: boolean;
}

export type ViewMode = 'feed' | 'map';

export interface GeolocationState {
  location: UserLocation | null;
  status: 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable';
  error?: string;
}
