interface DirectionsOptions {
  lat: number;
  lng: number;
  address?: string;
  venueName?: string;
}

export function getAppleMapsUrl(options: DirectionsOptions): string {
  const { lat, lng, address, venueName } = options;
  const destination = encodeURIComponent(address || `${lat},${lng}`);
  const label = venueName ? `&q=${encodeURIComponent(venueName)}` : '';
  return `https://maps.apple.com/?daddr=${destination}${label}&dirflg=d`;
}

export function getGoogleMapsUrl(options: DirectionsOptions): string {
  const { lat, lng, address } = options;
  const destination = address
    ? encodeURIComponent(address)
    : `${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

export function getWazeMapsUrl(options: DirectionsOptions): string {
  const { lat, lng } = options;
  return `https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

export function getDefaultMapsUrl(options: DirectionsOptions): string {
  if (isIOS()) {
    return getAppleMapsUrl(options);
  }
  return getGoogleMapsUrl(options);
}

export function openDirections(options: DirectionsOptions): void {
  const url = getDefaultMapsUrl(options);
  window.open(url, '_blank');
}
