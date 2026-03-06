import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import { CATEGORY_COLORS } from '../../constants';
import type { ScoredEvent } from '../../types';

// Extend Leaflet types to include markerClusterGroup
declare module 'leaflet' {
  function markerClusterGroup(options?: MarkerClusterGroupOptions): MarkerClusterGroup;

  interface MarkerClusterGroupOptions {
    chunkedLoading?: boolean;
    spiderfyOnMaxZoom?: boolean;
    showCoverageOnHover?: boolean;
    maxClusterRadius?: number;
    iconCreateFunction?: (cluster: MarkerCluster) => L.DivIcon;
  }

  interface MarkerCluster {
    getChildCount(): number;
  }

  interface MarkerClusterGroup extends L.FeatureGroup {
    addLayer(layer: L.Layer): this;
  }
}

interface MarkerClusterProps {
  events: ScoredEvent[];
  onEventClick: (event: ScoredEvent) => void;
  selectedEventId?: string | null;
}

function buildMarkerHtml(event: ScoredEvent, isSelected: boolean): string {
  const cat = CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS['Other'];
  const color = cat.primary;

  // Editor picks get a gold ring
  if (event.editorPick) {
    const size = isSelected ? 20 : 14;
    const ringSize = size + 6;
    return `
      <div style="position:relative;width:${ringSize}px;height:${ringSize}px;cursor:pointer;">
        <div style="
          position:absolute;
          inset:0;
          border-radius:50%;
          background:rgba(251,191,36,0.25);
          border:2px solid #d97706;
        "></div>
        <div style="
          position:absolute;
          top:3px;left:3px;
          width:${size}px;
          height:${size}px;
          background:linear-gradient(145deg,#fcd34d,#d97706);
          border-radius:50%;
          box-shadow:0 2px 8px rgba(251,191,36,0.5);
        "></div>
      </div>
    `;
  }

  // Simple filled circle for regular events
  const size = isSelected ? 16 : 12;
  const shadowColor = color + '66';
  const ringSize = isSelected ? size + 8 : size;

  const ring = isSelected
    ? `<div style="
        position:absolute;
        inset:0;
        border-radius:50%;
        background:${color}20;
        border:2px solid ${color}55;
      "></div>`
    : '';

  return `
    <div style="position:relative;width:${ringSize}px;height:${ringSize}px;cursor:pointer;">
      ${ring}
      <div style="
        position:absolute;
        ${isSelected ? 'top:4px;left:4px;' : 'inset:0;'}
        width:${size}px;
        height:${size}px;
        background:${color};
        border:2px solid white;
        border-radius:50%;
        box-shadow:0 2px 6px ${shadowColor};
      "></div>
    </div>
  `;
}

export function MarkerCluster({ events, onEventClick, selectedEventId }: MarkerClusterProps) {
  const map = useMap();

  useEffect(() => {
    const markers = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      iconCreateFunction: (cluster: L.MarkerCluster) => {
        const count = cluster.getChildCount();
        const size = count > 50 ? 44 : count > 10 ? 38 : 32;
        return L.divIcon({
          html: `
            <div style="
              width:${size}px;
              height:${size}px;
              background:var(--color-ink, #0A0E1A);
              border:2px solid white;
              border-radius:50%;
              display:flex;
              align-items:center;
              justify-content:center;
              color:white;
              font-weight:600;
              font-family:var(--font-sans, 'Jost', sans-serif);
              font-size:${count > 99 ? '11px' : '12px'};
              box-shadow:0 2px 8px rgba(10,14,26,0.4);
            ">${count}</div>
          `,
          className: 'marker-cluster',
          iconSize: L.point(size, size),
        });
      },
    });

    events.forEach((event) => {
      if (event.lat === null || event.lng === null) return;

      const isSelected = event.id === selectedEventId;
      const html = buildMarkerHtml(event, isSelected);

      // Calculate icon size based on selection state and editor pick
      let size: number;
      if (event.editorPick) {
        size = isSelected ? 26 : 20; // Gold ring pins are slightly larger
      } else {
        size = isSelected ? 24 : 12; // Simple circles
      }

      const icon = L.divIcon({
        className: event.editorPick ? 'custom-marker-editor' : 'custom-marker',
        html,
        iconSize: [size, size],
        iconAnchor: [Math.round(size / 2), Math.round(size / 2)],
      });

      const marker = L.marker([event.lat, event.lng], { icon });
      marker.on('click', () => onEventClick(event));
      markers.addLayer(marker);
    });

    map.addLayer(markers);

    return () => {
      map.removeLayer(markers);
    };
  }, [map, events, onEventClick, selectedEventId]);

  return null;
}
