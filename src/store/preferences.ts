/**
 * Unified Preference Store
 *
 * Single source of truth for all user preferences.
 * Everything reads from and writes to this store.
 */

export interface UserPreferences {
  // Location
  city: 'miami' | 'ftl' | 'pb' | null;
  useGPS: boolean;

  // Vibes (from onboarding vibe selection)
  vibes: string[];

  // Interest tags (derived from vibes + manual profile edits)
  interests: string[];

  // Meta
  onboardingComplete: boolean;
  locationSet: boolean;
}

const STORAGE_KEY = 'irl_preferences';

const DEFAULT: UserPreferences = {
  city: null,
  useGPS: false,
  vibes: [],
  interests: [],
  onboardingComplete: false,
  locationSet: false,
};

export function getPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function setPreferences(updates: Partial<UserPreferences>): void {
  const current = getPreferences();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...current,
    ...updates,
  }));
}

export function clearPreferences(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Vibe to Interest Tag Mapping
 *
 * Maps user-selected vibes from onboarding to interest tags
 * used for event ranking and filtering.
 */
export const VIBE_TO_INTERESTS: Record<string, string[]> = {
  'rooftop drinks': ['nightlife', 'food & drink'],
  'sweaty dance floor': ['nightlife', 'music'],
  'gallery opening': ['arts', 'culture'],
  'sunday market': ['community', 'food & drink'],
  'live music': ['music', 'community'],
  "chef's pop-up": ['food & drink', 'arts'],
  'beach bonfire': ['outdoor', 'nightlife'],
  'outdoor cinema': ['outdoor', 'arts'],
};

/**
 * Convert selected vibes to interest tags
 */
export function vibesToInterests(vibes: string[]): string[] {
  const tags = new Set<string>();
  vibes.forEach(vibe => {
    const interests = VIBE_TO_INTERESTS[vibe.toLowerCase()];
    if (interests) {
      interests.forEach(tag => tags.add(tag));
    }
  });
  return Array.from(tags);
}

/**
 * City coordinate anchors for GPS distance calculation
 */
export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  miami: { lat: 25.77, lng: -80.19 },
  ftl: { lat: 26.12, lng: -80.14 },
  pb: { lat: 26.71, lng: -80.05 },
};

/**
 * Get nearest city from GPS coordinates
 */
export function getNearestCity(lat: number, lng: number): 'miami' | 'ftl' | 'pb' {
  let nearest: 'miami' | 'ftl' | 'pb' = 'miami';
  let minDistance = Infinity;

  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    const distance = Math.sqrt(
      Math.pow(lat - coords.lat, 2) + Math.pow(lng - coords.lng, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearest = city as 'miami' | 'ftl' | 'pb';
    }
  }

  return nearest;
}

/**
 * City display names
 */
export const CITY_NAMES: Record<string, string> = {
  miami: 'Miami',
  ftl: 'Fort Lauderdale',
  pb: 'Palm Beach',
};
