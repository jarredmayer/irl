import type { UserLocation, GeolocationState } from '../types';

export type GeolocationCallback = (state: GeolocationState) => void;

let watchId: number | null = null;

export function isGeolocationSupported(): boolean {
  return 'geolocation' in navigator;
}

export function getCurrentPosition(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 minute cache
      }
    );
  });
}

export function watchPosition(callback: GeolocationCallback): void {
  if (!isGeolocationSupported()) {
    callback({
      location: null,
      status: 'unavailable',
      error: 'Geolocation is not supported',
    });
    return;
  }

  // Clear any existing watcher so this is safe to call multiple times
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  callback({ location: null, status: 'loading' });

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      callback({
        location: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: position.timestamp,
        },
        status: 'granted',
      });
    },
    (error) => {
      let status: GeolocationState['status'] = 'unavailable';
      let errorMessage = error.message;

      switch (error.code) {
        case error.PERMISSION_DENIED:
          status = 'denied';
          errorMessage = 'Location permission denied';
          break;
        case error.POSITION_UNAVAILABLE:
          status = 'unavailable';
          errorMessage = 'Location unavailable';
          break;
        case error.TIMEOUT:
          status = 'unavailable';
          errorMessage = 'Location request timed out';
          break;
      }

      callback({
        location: null,
        status,
        error: errorMessage,
      });
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    }
  );
}

export function stopWatchingPosition(): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

export async function requestPermission(): Promise<'granted' | 'denied' | 'unavailable'> {
  if (!isGeolocationSupported()) {
    return 'unavailable';
  }

  try {
    await getCurrentPosition();
    return 'granted';
  } catch (error) {
    if (error instanceof GeolocationPositionError) {
      if (error.code === error.PERMISSION_DENIED) {
        return 'denied';
      }
    }
    return 'unavailable';
  }
}
