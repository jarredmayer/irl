import { Chip, ChipGroup } from '../ui/Chip';
import { TAGS } from '../../constants';
import type { UserPreferences, TransportMode } from '../../types';

interface PreferencesViewProps {
  preferences: UserPreferences;
  onPreferencesChange: (preferences: UserPreferences) => void;
  locationStatus: 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable';
  onRequestLocation: () => void;
}

const radiusOptions = [1, 3, 5, 10, 25];

export function PreferencesView({
  preferences,
  onPreferencesChange,
  locationStatus,
  onRequestLocation,
}: PreferencesViewProps) {
  const toggleTag = (tag: string) => {
    const newTags = preferences.tags.includes(tag)
      ? preferences.tags.filter((t) => t !== tag)
      : [...preferences.tags, tag];
    onPreferencesChange({ ...preferences, tags: newTags });
  };

  const setRadius = (radius: number) => {
    onPreferencesChange({ ...preferences, radiusMiles: radius });
  };

  const setTransportMode = (mode: TransportMode) => {
    onPreferencesChange({ ...preferences, transportMode: mode });
  };

  return (
    <div className="px-4 py-4 space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Your Preferences</h1>

      {/* Location section */}
      <section className="bg-white rounded-xl p-4 border border-slate-100">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Location</h2>

        {locationStatus === 'granted' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
              <span className="text-sm">Location enabled</span>
            </div>

            {/* Radius */}
            <div>
              <p className="text-sm text-slate-600 mb-2">Search radius</p>
              <ChipGroup>
                {radiusOptions.map((radius) => (
                  <Chip
                    key={radius}
                    label={`${radius} mi`}
                    selected={preferences.radiusMiles === radius}
                    onClick={() => setRadius(radius)}
                    size="sm"
                  />
                ))}
              </ChipGroup>
            </div>

            {/* Transport mode */}
            <div>
              <p className="text-sm text-slate-600 mb-2">I usually...</p>
              <ChipGroup>
                <Chip
                  label="Walk"
                  selected={preferences.transportMode === 'walk'}
                  onClick={() => setTransportMode('walk')}
                  size="sm"
                />
                <Chip
                  label="Drive"
                  selected={preferences.transportMode === 'drive'}
                  onClick={() => setTransportMode('drive')}
                  size="sm"
                />
              </ChipGroup>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Enable location to see distances and filter events near you.
            </p>
            <button
              onClick={onRequestLocation}
              disabled={locationStatus === 'loading'}
              className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors disabled:opacity-50"
            >
              {locationStatus === 'loading'
                ? 'Getting location...'
                : locationStatus === 'denied'
                ? 'Location denied'
                : 'Enable location'}
            </button>
            {locationStatus === 'denied' && (
              <p className="text-xs text-slate-500">
                Check your browser settings to enable location access.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Interests section */}
      <section className="bg-white rounded-xl p-4 border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Your Interests</h2>
          {preferences.tags.length > 0 && (
            <button
              onClick={() => onPreferencesChange({ ...preferences, tags: [] })}
              className="text-xs text-sky-600 hover:text-sky-700"
            >
              Clear all
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500 mb-3">
          Select topics you're interested in. Events matching your interests will
          rank higher.
        </p>
        <ChipGroup>
          {TAGS.map((tag) => (
            <Chip
              key={tag}
              label={tag.replace(/-/g, ' ')}
              selected={preferences.tags.includes(tag)}
              onClick={() => toggleTag(tag)}
              size="sm"
              variant="outline"
            />
          ))}
        </ChipGroup>
      </section>

      {/* About section */}
      <section className="bg-white rounded-xl p-4 border border-slate-100">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">About IRL</h2>
        <p className="text-sm text-slate-600 mb-3">
          Curated local events in Miami and Fort Lauderdale. We handpick the best
          things to do based on what's actually worth your time.
        </p>
        <p className="text-xs text-slate-400">
          Data stored locally on your device. No account required.
        </p>
      </section>
    </div>
  );
}
