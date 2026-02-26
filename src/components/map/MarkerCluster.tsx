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
        const size = count > 50 ? 48 : count > 10 ? 44 : 38;
        return L.divIcon({
          html: `
            <div style="
              width: ${size}px;
              height: ${size}px;
              background: linear-gradient(135deg, #38bdf8, #0ea5e9);
              border: 2.5px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 700;
              font-size: ${count > 99 ? '11px' : '13px'};
              box-shadow: 0 4px 12px rgba(14,165,233,0.45), 0 1px 3px rgba(0,0,0,0.15);
              letter-spacing: -0.5px;
            ">${count}</div>
          `,
          className: 'marker-cluster',
          iconSize: L.point(size, size),
        });
      },
    });

    events.forEach((event) => {
      if (event.lat === null || event.lng === null) return;

      const icon = event.editorPick
        ? L.divIcon({
            className: 'custom-marker-editor',
            html: `
              <div style="position:relative;width:30px;height:38px;cursor:pointer;pointer-events:auto;">
                <div style="
                  width: 30px;
                  height: 30px;
                  background: linear-gradient(135deg, #fbbf24, #f59e0b);
                  border: 2.5px solid white;
                  border-radius: 50% 50% 50% 0;
                  transform: rotate(-45deg);
                  box-shadow: 0 4px 12px rgba(245,158,11,0.5), 0 1px 3px rgba(0,0,0,0.2);
                  position: absolute;
                  top: 0;
                  left: 0;
                "></div>
                <div style="
                  position:absolute;top:5px;left:5px;
                  width:20px;height:20px;
                  display:flex;align-items:center;justify-content:center;
                  transform:rotate(45deg);
                  font-size:11px;
                ">★</div>
              </div>
            `,
            iconSize: [30, 38],
            iconAnchor: [15, 38],
          })
        : L.divIcon({
            className: 'custom-marker',
            html: `
              <div style="position:relative;width:26px;height:34px;cursor:pointer;pointer-events:auto;">
                <div style="
                  width: 26px;
                  height: 26px;
                  background: linear-gradient(135deg, #38bdf8, #0ea5e9);
                  border: 2.5px solid white;
                  border-radius: 50% 50% 50% 0;
                  transform: rotate(-45deg);
                  box-shadow: 0 4px 10px rgba(14,165,233,0.45), 0 1px 3px rgba(0,0,0,0.15);
                  position: absolute;
                  top: 0;
                  left: 0;
                "></div>
              </div>
            `,
            iconSize: [26, 34],
            iconAnchor: [13, 34],
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
