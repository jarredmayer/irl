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
        background:rgba(59,130,246,0.18);
        border:1.5px solid rgba(59,130,246,0.45);
      "></div>
      <div class="user-loc-ring" style="
        position:absolute;inset:0;
        border-radius:50%;
        background:rgba(59,130,246,0.12);
        border:1.5px solid rgba(59,130,246,0.3);
        animation-delay:0.8s;
      "></div>
      <div style="
        position:absolute;
        width:10px;height:10px;
        background:#3b82f6;
        border:2.5px solid white;
        border-radius:50%;
        top:7px;left:7px;
        box-shadow:0 0 10px rgba(59,130,246,0.65);
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
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/90"
          style={{
            background: 'rgba(8,12,26,0.72)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
          }}
        >
          <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
            <path strokeLinecap="round" d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
          {events.length} events
        </div>
      </div>

      {/* ── Floating HUD: filter toggle (top-right) ── */}
      {filters && onFiltersChange && (
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/90 transition-colors"
          style={{
            background: showFilters
              ? 'rgba(14,165,233,0.85)'
              : 'rgba(8,12,26,0.72)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: showFilters
              ? '1px solid rgba(56,189,248,0.4)'
              : '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />
          )}
        </button>
      )}

      {/* ── Collapsible filter panel ── */}
      {showFilters && filters && onFiltersChange && (
        <div className="absolute top-14 left-3 right-3 z-[1000] bg-white rounded-xl shadow-2xl border border-slate-200 max-h-[60vh] overflow-y-auto">
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
          {/* Dark basemap: CARTO Dark Matter */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
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
            className="absolute bottom-4 right-4 z-[1000] w-10 h-10 rounded-full flex items-center justify-center text-white/90 transition-colors active:scale-95"
            style={{
              background: 'rgba(8,12,26,0.76)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 2px 14px rgba(0,0,0,0.45)',
            }}
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
