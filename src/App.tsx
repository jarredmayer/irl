import { useState, useMemo } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  useParams,
} from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { FeedView } from './components/feed/FeedView';
import { EventDetail } from './components/detail/EventDetail';
import { MapView } from './components/map/MapView';
import { FollowingView } from './components/following/FollowingView';
import { ProfileView } from './components/profile/ProfileView';
import { ChatAssistant } from './components/ai/ChatAssistant';
import { AISettingsModal } from './components/ai/AISettingsModal';
import { useEvents } from './hooks/useEvents';
import { usePreferences } from './hooks/usePreferences';
import { useSavedEvents } from './hooks/useSavedEvents';
import { useFollowing } from './hooks/useFollowing';
import { useGeolocation } from './hooks/useGeolocation';
import { useWeather } from './hooks/useWeather';
import { useProfile } from './hooks/useProfile';
import { DEFAULT_FILTERS } from './constants';
import type { FilterState } from './types';
import './index.css';

function AppContent() {
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS });
  const [showAISettings, setShowAISettings] = useState(false);

  const { preferences, updatePreferences, isLoaded: prefsLoaded } = usePreferences();
  const { isLoaded: savedLoaded } = useSavedEvents();
  const { following, toggleFollow, unfollow, venueIds, seriesIds, neighborhoodIds, isLoaded: followingLoaded } = useFollowing();
  const { profile, updateProfile, isLoaded: profileLoaded } = useProfile();
  const { location, status: locationStatus, requestLocation } = useGeolocation();
  const { weather, weatherNote } = useWeather(location);

  const {
    filteredEvents,
    groupedEvents,
    getEventById,
  } = useEvents({
    preferences,
    location,
    weather,
    filters,
  });

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

  const isLoading = !prefsLoaded || !savedLoaded || !followingLoaded || !profileLoaded;

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
            <MapView
              events={filteredEvents}
              userLocation={location}
              filters={filters}
              onFiltersChange={setFilters}
              hasLocation={locationStatus === 'granted'}
            />
          }
        />
        <Route
          path="following"
          element={
            <FollowingView
              events={followingEvents}
              following={following}
              onUnfollow={unfollow}
              onFollow={toggleFollow}
              followingVenueIds={venueIds}
              followingSeriesIds={seriesIds}
              followingNeighborhoods={neighborhoodIds}
            />
          }
        />
        <Route
          path="profile"
          element={
            <ProfileView
              profile={profile}
              onProfileChange={updateProfile}
              preferences={preferences}
              onPreferencesChange={updatePreferences}
              locationStatus={locationStatus}
              onRequestLocation={requestLocation}
              onConfigureAI={() => setShowAISettings(true)}
            />
          }
        />
      </Route>
      <Route
        path="event/:id"
        element={
          <EventDetailPage
            getEventById={getEventById}
            onFollow={toggleFollow}
            followingVenueIds={venueIds}
            followingSeriesIds={seriesIds}
            followingNeighborhoods={neighborhoodIds}
            weather={weather}
          />
        }
      />
    </Routes>

    {/* AI Chat Assistant */}
    <ChatAssistant
      events={filteredEvents}
      preferences={preferences}
      onConfigureAI={() => setShowAISettings(true)}
    />

    {/* AI Settings Modal */}
    <AISettingsModal
      isOpen={showAISettings}
      onClose={() => setShowAISettings(false)}
    />
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
