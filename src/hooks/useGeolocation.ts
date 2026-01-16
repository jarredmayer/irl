import { useState, useEffect, useCallback } from 'react';
import {
  getCurrentPosition,
  watchPosition,
  stopWatchingPosition,
  isGeolocationSupported,
} from '../services/geolocation';
import {
  getLastKnownLocation,
  saveLocation,
  clearLocation,
} from '../services/storage';
import type { GeolocationState } from '../types';

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    status: 'idle',
  });

  // Load last known location on mount
  useEffect(() => {
    const lastKnown = getLastKnownLocation();
    if (lastKnown) {
      setState({
        location: lastKnown,
        status: 'granted',
      });
    }
  }, []);

  const requestLocation = useCallback(async () => {
    if (!isGeolocationSupported()) {
      setState({
        location: null,
        status: 'unavailable',
        error: 'Geolocation is not supported',
      });
      return;
    }

    setState((prev) => ({ ...prev, status: 'loading' }));

    try {
      const location = await getCurrentPosition();
      saveLocation(location);
      setState({
        location,
        status: 'granted',
      });
    } catch (error) {
      const geoError = error as GeolocationPositionError;
      let status: GeolocationState['status'] = 'unavailable';

      if (geoError.code === geoError.PERMISSION_DENIED) {
        status = 'denied';
        clearLocation();
      }

      setState({
        location: null,
        status,
        error: geoError.message,
      });
    }
  }, []);

  const startWatching = useCallback(() => {
    watchPosition((newState) => {
      if (newState.location) {
        saveLocation(newState.location);
      }
      setState(newState);
    });
  }, []);

  const stopWatching = useCallback(() => {
    stopWatchingPosition();
  }, []);

  const clearStoredLocation = useCallback(() => {
    clearLocation();
    setState({
      location: null,
      status: 'idle',
    });
  }, []);

  return {
    ...state,
    requestLocation,
    startWatching,
    stopWatching,
    clearStoredLocation,
    isSupported: isGeolocationSupported(),
  };
}
