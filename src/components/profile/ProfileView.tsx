import { useState } from 'react';
import type { UserProfile, UserPreferences, GeolocationState } from '../../types';
import { TAGS } from '../../constants';
import { Chip, ChipGroup } from '../ui/Chip';

interface ProfileViewProps {
  profile: UserProfile;
  onProfileChange: (profile: UserProfile) => void;
  preferences: UserPreferences;
  onPreferencesChange: (preferences: UserPreferences) => void;
  locationStatus: GeolocationState['status'];
  onRequestLocation: () => void;
}

export function ProfileView({
  profile,
  onProfileChange,
  preferences,
  onPreferencesChange,
  locationStatus,
  onRequestLocation,
}: ProfileViewProps) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editHandle, setEditHandle] = useState(profile.handle || '');
  const [editDisplayName, setEditDisplayName] = useState(profile.displayName || '');

  const handleSaveProfile = () => {
    onProfileChange({
      ...profile,
      handle: editHandle.trim() || undefined,
      displayName: editDisplayName.trim() || undefined,
    });
    setIsEditingProfile(false);
  };

  const toggleTag = (tag: string) => {
    const newTags = preferences.tags.includes(tag)
      ? preferences.tags.filter((t) => t !== tag)
      : [...preferences.tags, tag];
    onPreferencesChange({ ...preferences, tags: newTags });
  };

  return (
    <div className="min-h-screen">
      <div className="px-4 py-6 space-y-6">
        {/* Profile Card */}
        <section className="bg-white rounded-2xl p-6 border border-slate-100">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold">
                {profile.displayName?.[0]?.toUpperCase() || profile.handle?.[0]?.toUpperCase() || '?'}
              </div>
              <button
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                onClick={() => {/* TODO: Add photo upload */}}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </button>
            </div>

            {/* Info */}
            <div className="flex-1">
              {isEditingProfile ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Display Name</label>
                    <input
                      type="text"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Handle</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
                      <input
                        type="text"
                        value={editHandle}
                        onChange={(e) => setEditHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                        placeholder="username"
                        className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      className="px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingProfile(false);
                        setEditHandle(profile.handle || '');
                        setEditDisplayName(profile.displayName || '');
                      }}
                      className="px-4 py-2 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-slate-900">
                    {profile.displayName || 'Set your name'}
                  </h2>
                  {profile.handle ? (
                    <p className="text-sky-500 font-medium">@{profile.handle}</p>
                  ) : (
                    <p className="text-slate-400 text-sm">No handle set</p>
                  )}
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="mt-3 text-sm text-sky-500 hover:text-sky-600 font-medium"
                  >
                    Edit Profile
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Location Settings */}
        <section className="bg-white rounded-2xl p-5 border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-3">Location</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">
                {locationStatus === 'granted'
                  ? 'Location access enabled'
                  : locationStatus === 'denied'
                  ? 'Location access denied'
                  : 'Enable location for nearby events'}
              </p>
            </div>
            {locationStatus !== 'granted' && (
              <button
                onClick={onRequestLocation}
                disabled={locationStatus === 'loading'}
                className="px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50"
              >
                {locationStatus === 'loading' ? 'Requesting...' : 'Enable'}
              </button>
            )}
            {locationStatus === 'granted' && (
              <span className="text-emerald-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </div>
        </section>

        {/* Distance Preference */}
        <section className="bg-white rounded-2xl p-5 border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-3">Search Radius</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Show events within</span>
              <span className="font-medium text-sky-600">{preferences.radiusMiles} miles</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={preferences.radiusMiles}
              onChange={(e) =>
                onPreferencesChange({ ...preferences, radiusMiles: Number(e.target.value) })
              }
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>1 mi</span>
              <span>50 mi</span>
            </div>
          </div>
        </section>

        {/* Interests */}
        <section className="bg-white rounded-2xl p-5 border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-3">Your Interests</h3>
          <p className="text-sm text-slate-500 mb-4">
            Select tags to personalize your feed. Events matching your interests will rank higher.
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

        {/* App Info */}
        <section className="text-center text-sm text-slate-400 py-4">
          <p className="font-medium text-slate-500">irl.</p>
          <p>Curated local discovery</p>
          <p className="mt-1">Miami / Fort Lauderdale</p>
        </section>
      </div>
    </div>
  );
}
