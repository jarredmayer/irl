import { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
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
  filters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
  hasLocation?: boolean;
  onSwitchToList?: () => void;
}

// Expose the Leaflet map instance via a ref
function MapController({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

// Animated user-location marker icon (built once)
const userLocationIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:24px;height:24px;">
      <div class="user-loc-ring" style="
        position:absolute;inset:0;
        border-radius:50%;
        background:rgba(10,14,26,0.12);
        border:1.5px solid rgba(10,14,26,0.25);
      "></div>
      <div class="user-loc-ring" style="
        position:absolute;inset:0;
        border-radius:50%;
        background:rgba(10,14,26,0.08);
        border:1.5px solid rgba(10,14,26,0.18);
        animation-delay:0.8s;
      "></div>
      <div style="
        position:absolute;
        width:10px;height:10px;
        background:#0A0E1A;
        border:2.5px solid white;
        border-radius:50%;
        top:7px;left:7px;
        box-shadow:0 0 8px rgba(10,14,26,0.45);
      "></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export function MapView({
  events,
  userLocation,
  filters,
  onFiltersChange,
  hasLocation = false,
  onSwitchToList,
}: MapViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<ScoredEvent | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  const handleEventClick = useCallback((event: ScoredEvent) => {
    setSelectedEvent(event);
  }, []);

  const handleClosePreview = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  const handleRecenter = useCallback(() => {
    if (mapRef.current && userLocation) {
      mapRef.current.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 0.8 });
    }
  }, [userLocation]);

  const hasActiveFilters =
    (filters?.selectedTags.length ?? 0) > 0 ||
    Boolean(filters?.searchQuery) ||
    Boolean(filters?.freeOnly) ||
    Boolean(filters?.city);

  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [MIAMI_CENTER.lat, MIAMI_CENTER.lng];

  return (
    <div className="h-[calc(100vh-52px-64px)] relative flex flex-col">

      {/* ── Floating HUD: event count (top-left) ── */}
      <div className="absolute top-3 left-3 z-[1000]">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/95 text-ink shadow-md border border-divider backdrop-blur">
          <div className="w-2 h-2 rounded-full bg-ink" />
          {events.length} events
        </div>
      </div>

      {/* ── List view toggle (top-center) ── */}
      {onSwitchToList && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000]">
          <button
            onClick={onSwitchToList}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-ink text-white shadow-md transition-transform active:scale-95 btn-press"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            List view
          </button>
        </div>
      )}

      {/* ── Floating HUD: filter toggle (top-right) ── */}
      {filters && onFiltersChange && (
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md border backdrop-blur transition-colors btn-press ${
            showFilters
              ? 'bg-ink text-white border-ink'
              : 'bg-white/95 text-ink border-divider'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className={`w-1.5 h-1.5 rounded-full ${showFilters ? 'bg-white' : 'bg-ink'}`} />
          )}
        </button>
      )}

      {/* ── Collapsible filter panel ── */}
      {showFilters && filters && onFiltersChange && (
        <div className="absolute top-14 left-3 right-3 z-[1000] bg-white rounded-[22px] shadow-xl border border-divider max-h-[60vh] overflow-y-auto">
          <FilterBar
            filters={filters}
            onFiltersChange={onFiltersChange}
            hasLocation={hasLocation}
          />
        </div>
      )}

      {/* ── Map ── */}
      <div className="flex-1 relative">
        <MapContainer
          center={center}
          zoom={12}
          className="h-full w-full"
          zoomControl={false}
        >
          {/* Light basemap: CARTO Voyager — matches the app's light slate/sky palette */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />

          <MapController mapRef={mapRef} />

          <MarkerCluster
            events={events}
            onEventClick={handleEventClick}
            selectedEventId={selectedEvent?.id}
          />

          {/* Animated user location */}
          {userLocation && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={userLocationIcon}
              interactive={false}
            />
          )}
        </MapContainer>

        {/* ── Recenter button (bottom-right inside map) ── */}
        {userLocation && (
          <button
            onClick={handleRecenter}
            className="absolute bottom-4 right-4 z-[1000] w-10 h-10 rounded-full flex items-center justify-center bg-white text-ink shadow-lg border border-divider transition-transform active:scale-95 btn-press"
            aria-label="Recenter map on my location"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="12" cy="12" r="3" />
              <path strokeLinecap="round" d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              <path strokeLinecap="round" d="M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          </button>
        )}
      </div>

      <EventPreviewSheet event={selectedEvent} onClose={handleClosePreview} />
    </div>
  );
}
