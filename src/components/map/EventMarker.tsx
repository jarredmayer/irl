import { Marker } from 'react-leaflet';
import L from 'leaflet';
import type { ScoredEvent } from '../../types';

interface EventMarkerProps {
  event: ScoredEvent;
  isSelected?: boolean;
  onClick?: (event: ScoredEvent) => void;
}

const defaultIcon = L.divIcon({
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

const selectedIcon = L.divIcon({
  className: 'custom-marker-selected',
  html: `
    <div style="
      width: 40px;
      height: 40px;
      background: #0284c7;
      border: 4px solid white;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const editorPickIcon = L.divIcon({
  className: 'custom-marker-editor',
  html: `
    <div style="
      width: 36px;
      height: 36px;
      background: #f59e0b;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    "></div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

export function EventMarker({ event, isSelected, onClick }: EventMarkerProps) {
  if (event.lat === null || event.lng === null) {
    return null;
  }

  const icon = isSelected
    ? selectedIcon
    : event.editorPick
    ? editorPickIcon
    : defaultIcon;

  return (
    <Marker
      position={[event.lat, event.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onClick?.(event),
      }}
    />
  );
}
