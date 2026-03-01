import { useState, useEffect, useRef } from 'react';
import type { UserProfile, UserPreferences, GeolocationState } from '../../types';
import { TAGS } from '../../constants';
import { Chip, ChipGroup } from '../ui/Chip';
import { SubmitEventForm, type UserSubmittedEvent } from './SubmitEventForm';
import { SubmitAccountForm } from './SubmitAccountForm';
import {
  saveUserSubmittedEvent,
  getUserSubmittedEvents,
  deleteUserSubmittedEvent,
  saveSubmittedAccount,
  getSubmittedAccounts,
  deleteSubmittedAccount,
  type SubmittedAccount,
} from '../../services/storage';
import { hasApiKey } from '../../services/ai';
import { format, parseISO } from 'date-fns';
import type { useNotifications } from '../../hooks/useNotifications';

interface ProfileViewProps {
  profile: UserProfile;
  onProfileChange: (profile: UserProfile) => void;
  preferences: UserPreferences;
  onPreferencesChange: (preferences: UserPreferences) => void;
  locationStatus: GeolocationState['status'];
  onRequestLocation: () => void;
  onConfigureAI?: () => void;
  notifications?: ReturnType<typeof useNotifications>;
}

export function ProfileView({
  profile,
  onProfileChange,
  preferences,
  onPreferencesChange,
  locationStatus,
  onRequestLocation,
  onConfigureAI,
  notifications,
}: ProfileViewProps) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editHandle, setEditHandle] = useState(profile.handle || '');
  const [editDisplayName, setEditDisplayName] = useState(profile.displayName || '');
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [showSubmitAccountForm, setShowSubmitAccountForm] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onProfileChange({ ...profile, photoUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };
  const [submittedEvents, setSubmittedEvents] = useState<UserSubmittedEvent[]>([]);
  const [submittedAccounts, setSubmittedAccounts] = useState<SubmittedAccount[]>([]);
  const [showSubmitSuccess, setShowSubmitSuccess] = useState(false);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState('');

  useEffect(() => {
    setSubmittedEvents(getUserSubmittedEvents());
    setSubmittedAccounts(getSubmittedAccounts());
  }, []);

  const handleEventSubmit = (event: UserSubmittedEvent) => {
    saveUserSubmittedEvent(event);
    setSubmittedEvents(getUserSubmittedEvents());
    setShowSubmitForm(false);
    setSubmitSuccessMessage('Event submitted! We\'ll review it shortly.');
    setShowSubmitSuccess(true);
    setTimeout(() => setShowSubmitSuccess(false), 3000);
  };

  const handleAccountSubmit = (account: SubmittedAccount) => {
    saveSubmittedAccount(account);
    setSubmittedAccounts(getSubmittedAccounts());
    setShowSubmitAccountForm(false);
    setSubmitSuccessMessage(`@${account.handle} submitted — thanks for the tip!`);
    setShowSubmitSuccess(true);
    setTimeout(() => setShowSubmitSuccess(false), 3000);
  };

  const handleDeleteSubmittedEvent = (eventId: string) => {
    deleteUserSubmittedEvent(eventId);
    setSubmittedEvents(getUserSubmittedEvents());
  };

  const handleDeleteSubmittedAccount = (accountId: string) => {
    deleteSubmittedAccount(accountId);
    setSubmittedAccounts(getSubmittedAccounts());
  };

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
              {profile.photoUrl ? (
                <img
                  src={profile.photoUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold">
                  {profile.displayName?.[0]?.toUpperCase() || profile.handle?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <button
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                onClick={() => photoInputRef.current?.click()}
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

        {/* Notifications */}
        {notifications?.isSupported && (
          <section className="bg-white rounded-2xl p-5 border border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-3">Notifications</h3>
            {notifications.permission === 'denied' ? (
              <p className="text-sm text-slate-500">
                Notifications are blocked. Enable them in your browser settings to get daily reminders for saved events.
              </p>
            ) : notifications.permission === 'granted' ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-700">Daily event reminders</p>
                  <p className="text-xs text-slate-400 mt-0.5">Notified when saved events are happening today</p>
                </div>
                <button
                  onClick={() => notifications.toggleEnabled(!notifications.enabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    notifications.enabled ? 'bg-sky-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      notifications.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-500 mb-3">
                  Get notified when saved events are happening today.
                </p>
                <button
                  onClick={notifications.requestPermission}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Enable notifications
                </button>
              </div>
            )}
          </section>
        )}

        {/* AI Features */}
        <section className="bg-white rounded-2xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-slate-900">AI Features</h3>
            <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">Beta</span>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Enable AI-powered features like natural language search and the chat assistant.
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasApiKey() ? (
                <>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-sm text-emerald-600 font-medium">API key configured</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-slate-300 rounded-full" />
                  <span className="text-sm text-slate-500">Not configured</span>
                </>
              )}
            </div>
            <button
              onClick={onConfigureAI}
              className="px-4 py-2 bg-gradient-to-r from-violet-500 to-sky-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              {hasApiKey() ? 'Settings' : 'Configure'}
            </button>
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

        {/* Submit Event + Submit Account — side by side */}
        <section className="bg-white rounded-2xl p-5 border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-1">Contribute</h3>
          <p className="text-sm text-slate-500 mb-4">Help us find more great events in Miami & Fort Lauderdale.</p>
          <div className="grid grid-cols-2 gap-3 mb-2">
            {/* Submit Event inline button */}
            <button
              onClick={() => setShowSubmitForm(true)}
              className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-sky-400 hover:bg-sky-50 transition-all group"
            >
              <svg className="w-6 h-6 text-slate-400 group-hover:text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium text-slate-700 group-hover:text-sky-700 text-center">Submit an event</span>
            </button>
            {/* Submit Account button */}
            <button
              onClick={() => setShowSubmitAccountForm(true)}
              className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-pink-400 hover:bg-pink-50 transition-all group"
            >
              <svg className="w-6 h-6 text-slate-400 group-hover:text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25" />
              </svg>
              <span className="text-sm font-medium text-slate-700 group-hover:text-pink-700 text-center">Suggest Instagram</span>
            </button>
          </div>
        </section>

        {/* Your Submitted Events */}
        {submittedEvents.length > 0 && (
          <section className="bg-white rounded-2xl p-5 border border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-3">Your Submissions</h3>
            <div className="space-y-3">
              {submittedEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-3 bg-slate-50 rounded-xl flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{event.title}</p>
                    <p className="text-sm text-slate-500">
                      {format(parseISO(event.startAt), 'MMM d, yyyy')} at {event.venueName || event.neighborhood}
                    </p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                        event.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : event.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {event.status === 'pending' ? 'Pending Review' : event.status === 'approved' ? 'Approved' : 'Not Added'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteSubmittedEvent(event.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete submission"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Your Submitted Instagram Accounts */}
        {submittedAccounts.length > 0 && (
          <section className="bg-white rounded-2xl p-5 border border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-3">Suggested Accounts</h3>
            <div className="space-y-2">
              {submittedAccounts.map((acct) => (
                <div key={acct.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">@{acct.handle}</p>
                    <p className="text-xs text-slate-500 mt-0.5 capitalize">{acct.accountType} · {acct.city}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1 bg-amber-100 text-amber-700">
                      Pending Review
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteSubmittedAccount(acct.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* App Info */}
        <section className="text-center text-sm text-slate-400 py-4">
          <p className="font-medium text-slate-500">irl.</p>
          <p>Curated local discovery</p>
          <p className="mt-1">Miami / Fort Lauderdale</p>
        </section>
      </div>

      {/* Submit Event Modal */}
      {showSubmitForm && (
        <SubmitEventForm
          onClose={() => setShowSubmitForm(false)}
          onSubmit={handleEventSubmit}
        />
      )}

      {/* Submit Account Modal */}
      {showSubmitAccountForm && (
        <SubmitAccountForm
          onClose={() => setShowSubmitAccountForm(false)}
          onSubmit={handleAccountSubmit}
        />
      )}

      {/* Success Toast */}
      {showSubmitSuccess && (
        <div className="fixed bottom-20 left-4 right-4 z-50">
          <div className="bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {submitSuccessMessage}
          </div>
        </div>
      )}
    </div>
  );
}
