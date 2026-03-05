import { useState, useMemo, lazy, Suspense } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useParams,
} from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { FeedView } from './components/feed/FeedView';
import { InstallPrompt } from './components/pwa/InstallPrompt';

import { OfflineBanner } from './components/pwa/OfflineBanner';
import { useEvents } from './hooks/useEvents';
import { usePreferences } from './hooks/usePreferences';
import { useSavedEvents } from './hooks/useSavedEvents';
import { useFollowing } from './hooks/useFollowing';
import { useGeolocation } from './hooks/useGeolocation';
import { useWeather } from './hooks/useWeather';
import { useProfile } from './hooks/useProfile';
import { useNotifications } from './hooks/useNotifications';
import { DEFAULT_FILTERS } from './constants';
import type { FilterState } from './types';
import './index.css';

// Lazy-loaded route components (split into separate chunks)
const MapView = lazy(() => import('./components/map/MapView').then(m => ({ default: m.MapView })));
const FollowingView = lazy(() => import('./components/following/FollowingView').then(m => ({ default: m.FollowingView })));
const ProfileView = lazy(() => import('./components/profile/ProfileView').then(m => ({ default: m.ProfileView })));
const EventDetail = lazy(() => import('./components/detail/EventDetail').then(m => ({ default: m.EventDetail })));
const ChatAssistant = lazy(() => import('./components/ai/ChatAssistant').then(m => ({ default: m.ChatAssistant })));
const AISettingsModal = lazy(() => import('./components/ai/AISettingsModal').then(m => ({ default: m.AISettingsModal })));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-3 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
    </div>
  );
}

function AppContent() {
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS });
  const [showAISettings, setShowAISettings] = useState(false);

  const { preferences, updatePreferences, isLoaded: prefsLoaded } = usePreferences();
  const { savedIds, isLoaded: savedLoaded } = useSavedEvents();
  const { following, toggleFollow, unfollow, venueIds, seriesIds, neighborhoodIds, isLoaded: followingLoaded } = useFollowing();
  const { profile, updateProfile, isLoaded: profileLoaded } = useProfile();
  const { location, status: locationStatus, requestLocation } = useGeolocation();
  const { weather, weatherNote } = useWeather(location);

  const {
    filteredEvents,
    groupedEvents,
    getEventById,
    allEvents,
    isLoading: eventsLoading,
  } = useEvents({
    preferences,
    location,
    weather,
    filters,
  });

  const notifications = useNotifications(savedIds, allEvents);

  const feedSections = useMemo(
    () => [
      { title: 'Tonight', events: groupedEvents.tonight },
      { title: 'Tomorrow', events: groupedEvents.tomorrow },
      { title: 'This Weekend', events: groupedEvents.thisWeekend },
      { title: 'This Week', events: groupedEvents.nextWeek },
      { title: 'Worth Planning', events: groupedEvents.worthPlanning },
    ],
    [groupedEvents]
  );

  // Events from followed venues, series, or neighborhoods
  const followingEvents = useMemo(() => {
    return filteredEvents.filter((event) => {
      // Check if event matches any followed venue
      if (event.venueId && venueIds.includes(event.venueId)) return true;
      // Check if event matches any followed series
      if (event.seriesId && seriesIds.includes(event.seriesId)) return true;
      // Check if event matches any followed neighborhood
      if (neighborhoodIds.includes(event.neighborhood)) return true;
      return false;
    });
  }, [filteredEvents, venueIds, seriesIds, neighborhoodIds]);

  const isLoading = eventsLoading || !prefsLoaded || !savedLoaded || !followingLoaded || !profileLoaded;

  const clearFilters = () => setFilters({ ...DEFAULT_FILTERS });

  return (
    <>
    <Routes>
      <Route
        element={<AppShell weatherNote={weatherNote} weather={weather} />}
      >
        <Route
          index
          element={
            <FeedView
              sections={feedSections}
              filters={filters}
              onFiltersChange={setFilters}
              hasLocation={locationStatus === 'granted'}
              isLoading={isLoading}
              onClearFilters={clearFilters}
              onFollow={toggleFollow}
              followingVenueIds={venueIds}
              followingSeriesIds={seriesIds}
              followingNeighborhoods={neighborhoodIds}
              weather={weather}
              onConfigureAI={() => setShowAISettings(true)}
            />
          }
        />
        <Route
          path="map"
          element={
            <Suspense fallback={<RouteFallback />}>
              <MapView
                events={filteredEvents}
                userLocation={location}
                filters={filters}
                onFiltersChange={setFilters}
                hasLocation={locationStatus === 'granted'}
              />
            </Suspense>
          }
        />
        <Route
          path="following"
          element={
            <Suspense fallback={<RouteFallback />}>
              <FollowingView
                events={followingEvents}
                following={following}
                onUnfollow={unfollow}
                onFollow={toggleFollow}
                followingVenueIds={venueIds}
                followingSeriesIds={seriesIds}
                followingNeighborhoods={neighborhoodIds}
              />
            </Suspense>
          }
        />
        <Route
          path="profile"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ProfileView
                profile={profile}
                onProfileChange={updateProfile}
                preferences={preferences}
                onPreferencesChange={updatePreferences}
                locationStatus={locationStatus}
                onRequestLocation={requestLocation}
                onConfigureAI={() => setShowAISettings(true)}
                notifications={notifications}
              />
            </Suspense>
          }
        />
      </Route>
      <Route
        path="event/:id"
        element={
          <Suspense fallback={<RouteFallback />}>
            <EventDetailPage
              getEventById={getEventById}
              onFollow={toggleFollow}
              followingVenueIds={venueIds}
              followingSeriesIds={seriesIds}
              followingNeighborhoods={neighborhoodIds}
              weather={weather}
            />
          </Suspense>
        }
      />
    </Routes>

    {/* AI Chat Assistant */}
    <Suspense fallback={null}>
      <ChatAssistant
        events={filteredEvents}
        preferences={preferences}
        onConfigureAI={() => setShowAISettings(true)}
      />
    </Suspense>

    {/* AI Settings Modal */}
    {showAISettings && (
      <Suspense fallback={null}>
        <AISettingsModal
          isOpen={showAISettings}
          onClose={() => setShowAISettings(false)}
        />
      </Suspense>
    )}

    {/* PWA Install Prompt */}
    <InstallPrompt />

{/* Offline Indicator */}
    <OfflineBanner />
    </>
  );
}

function EventDetailPage({
  getEventById,
  onFollow,
  followingVenueIds,
  followingSeriesIds,
  followingNeighborhoods,
  weather,
}: {
  getEventById: (id: string) => ReturnType<typeof useEvents>['getEventById'] extends (id: string) => infer R ? R : never;
  onFollow: (id: string, type: import('./types').FollowType, name: string) => void;
  followingVenueIds: string[];
  followingSeriesIds: string[];
  followingNeighborhoods: string[];
  weather: import('./types').WeatherForecast | null;
}) {
  const { id } = useParams<{ id: string }>();
  const event = id ? getEventById(id) : undefined;

  return (
    <EventDetail
      event={event}
      onFollow={onFollow}
      isFollowingVenue={event?.venueId ? followingVenueIds.includes(event.venueId) : false}
      isFollowingSeries={event?.seriesId ? followingSeriesIds.includes(event.seriesId) : false}
      isFollowingNeighborhood={event ? followingNeighborhoods.includes(event.neighborhood) : false}
      weather={weather}
    />
  );
}

function App() {
  return (
    <BrowserRouter basename="/irl">
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
