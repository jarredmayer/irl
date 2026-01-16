import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
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
}

export function MarkerCluster({ events, onEventClick }: MarkerClusterProps) {
  const map = useMap();

  useEffect(() => {
    const markers = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      iconCreateFunction: (cluster: L.MarkerCluster) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `
            <div style="
              width: 40px;
              height: 40px;
              background: #0ea5e9;
              border: 3px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 600;
              font-size: 14px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            ">${count}</div>
          `,
          className: 'marker-cluster',
          iconSize: L.point(40, 40),
        });
      },
    });

    events.forEach((event) => {
      if (event.lat === null || event.lng === null) return;

      const icon = event.editorPick
        ? L.divIcon({
            className: 'custom-marker-editor',
            html: `
              <div style="
                width: 32px;
                height: 32px;
                background: #f59e0b;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
              "></div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })
        : L.divIcon({
            className: 'custom-marker',
            html: `
              <div style="
                width: 32px;
                height: 32px;
                background: #0ea5e9;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
              "></div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

      const marker = L.marker([event.lat, event.lng], { icon });
      marker.on('click', () => onEventClick(event));
      markers.addLayer(marker);
    });

    map.addLayer(markers);

    return () => {
      map.removeLayer(markers);
    };
  }, [map, events, onEventClick]);

  return null;
}
