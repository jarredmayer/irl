import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Circle, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { MarkerCluster } from './MarkerCluster';
import { EventPreviewSheet } from './EventPreviewSheet';
import { FilterBar } from '../feed/FilterBar';
import { MIAMI_CENTER } from '../../constants';
import type { ScoredEvent, UserLocation, FilterState } from '../../types';

interface MapViewProps {
  events: ScoredEvent[];
  userLocation?: UserLocation | null;
  savedIds: string[];
  onSaveToggle: (eventId: string) => void;
  filters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
  hasLocation?: boolean;
}

export function MapView({
  events,
  userLocation,
  savedIds,
  onSaveToggle,
  filters,
  onFiltersChange,
  hasLocation = false,
}: MapViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<ScoredEvent | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const handleEventClick = useCallback((event: ScoredEvent) => {
    setSelectedEvent(event);
  }, []);

  const handleClosePreview = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [MIAMI_CENTER.lat, MIAMI_CENTER.lng];

  return (
    <div className="h-[calc(100vh-52px-64px)] relative flex flex-col">
      {/* Filter toggle button */}
      {filters && onFiltersChange && (
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="absolute top-3 right-3 z-[1000] bg-white px-3 py-2 rounded-xl shadow-lg border border-slate-200 flex items-center gap-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {(filters.selectedTags.length > 0 || filters.searchQuery || filters.freeOnly || filters.city) && (
            <span className="w-2 h-2 bg-sky-500 rounded-full" />
          )}
        </button>
      )}

      {/* Collapsible filters */}
      {showFilters && filters && onFiltersChange && (
        <div className="absolute top-14 left-3 right-3 z-[1000] bg-white rounded-xl shadow-lg border border-slate-200 max-h-[60vh] overflow-y-auto">
          <FilterBar
            filters={filters}
            onFiltersChange={onFiltersChange}
            hasLocation={hasLocation}
          />
        </div>
      )}

      {/* Event count badge */}
      <div className="absolute top-3 left-3 z-[1000] bg-white px-3 py-2 rounded-xl shadow-lg border border-slate-200 text-sm font-medium text-slate-700">
        {events.length} events
      </div>

      <div className="flex-1 relative">
        <MapContainer
        center={center}
        zoom={12}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerCluster events={events} onEventClick={handleEventClick} />
        {userLocation && (
          <>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={100}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                weight: 0,
              }}
            />
            <CircleMarker
              center={[userLocation.lat, userLocation.lng]}
              radius={8}
              pathOptions={{
                color: '#ffffff',
                fillColor: '#3b82f6',
                fillOpacity: 1,
                weight: 3,
              }}
            />
          </>
        )}
      </MapContainer>
      </div>

      <EventPreviewSheet
        event={selectedEvent}
        isSaved={selectedEvent ? savedIds.includes(selectedEvent.id) : false}
        onSaveToggle={onSaveToggle}
        onClose={handleClosePreview}
      />
    </div>
  );
}
