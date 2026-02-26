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
  const emoji = cat.emoji;

  if (event.editorPick) {
    const size = isSelected ? 46 : 36;
    const inner = Math.round(size * 0.72);
    const offset = Math.round((size - inner) / 2);
    const height = Math.round(size * 1.2);
    const glow = isSelected
      ? `<div style="
          position:absolute;
          width:${size + 14}px;height:${size + 14}px;
          top:-7px;left:-7px;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:rgba(251,191,36,0.22);
          border:1.5px solid rgba(251,191,36,0.4);
        "></div>`
      : '';
    return `
      <div style="position:relative;width:${size}px;height:${height}px;cursor:pointer;">
        ${glow}
        <div style="
          width:${size}px;
          height:${size}px;
          background:linear-gradient(145deg,#fcd34d,#d97706);
          border:2.5px solid rgba(255,255,255,0.92);
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 5px 18px rgba(251,191,36,0.65),0 2px 6px rgba(0,0,0,0.4);
          position:absolute;top:0;left:0;
        "></div>
        <div style="
          position:absolute;
          top:${offset}px;left:${offset}px;
          width:${inner}px;height:${inner}px;
          display:flex;align-items:center;justify-content:center;
          font-size:${Math.round(inner * 0.58)}px;
          line-height:1;
        ">⭐</div>
      </div>
    `;
  }

  const size = isSelected ? 38 : 30;
  const inner = Math.round(size * 0.7);
  const offset = Math.round((size - inner) / 2);
  const height = Math.round(size * 1.28);
  const shadowColor = color + '88';
  const glow = isSelected
    ? `<div style="
        position:absolute;
        width:${size + 12}px;height:${size + 12}px;
        top:-6px;left:-6px;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:${color}28;
        border:1.5px solid ${color}55;
      "></div>`
    : '';

  return `
    <div style="position:relative;width:${size}px;height:${height}px;cursor:pointer;">
      ${glow}
      <div style="
        width:${size}px;
        height:${size}px;
        background:${color};
        border:2px solid rgba(255,255,255,0.88);
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 4px 14px ${shadowColor},0 2px 5px rgba(0,0,0,0.35);
        position:absolute;top:0;left:0;
      "></div>
      <div style="
        position:absolute;
        top:${offset}px;left:${offset}px;
        width:${inner}px;height:${inner}px;
        display:flex;align-items:center;justify-content:center;
        font-size:${Math.round(inner * 0.56)}px;
        line-height:1;
      ">${emoji}</div>
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
        const size = count > 50 ? 50 : count > 10 ? 44 : 38;
        return L.divIcon({
          html: `
            <div style="
              width:${size}px;
              height:${size}px;
              background:rgba(10,14,26,0.82);
              border:2px solid rgba(255,255,255,0.75);
              border-radius:50%;
              display:flex;
              align-items:center;
              justify-content:center;
              color:white;
              font-weight:700;
              font-size:${count > 99 ? '11px' : '13px'};
              box-shadow:0 4px 18px rgba(0,0,0,0.55),0 1px 5px rgba(0,0,0,0.3);
              letter-spacing:-0.5px;
              backdrop-filter:blur(6px);
              -webkit-backdrop-filter:blur(6px);
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
      const baseSize = event.editorPick ? 36 : 30;
      const size = isSelected ? (event.editorPick ? 46 : 38) : baseSize;
      const height = Math.round(size * (event.editorPick ? 1.2 : 1.28));

      const icon = L.divIcon({
        className: event.editorPick ? 'custom-marker-editor' : 'custom-marker',
        html,
        iconSize: [size, height],
        iconAnchor: [Math.round(size / 2), height],
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
