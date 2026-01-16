import { useState, useEffect, useCallback } from 'react';
import { fetchWeather, getWeatherNote } from '../services/weather';
import type { WeatherForecast, UserLocation } from '../types';

interface UseWeatherResult {
  weather: WeatherForecast | null;
  weatherNote: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useWeather(location?: UserLocation | null): UseWeatherResult {
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWeather = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const forecast = await fetchWeather(location || undefined);
      setWeather(forecast);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load weather';
      setError(message);
      console.error('Weather fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [location?.lat, location?.lng]);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  const weatherNote = weather ? getWeatherNote(weather) : null;

  return {
    weather,
    weatherNote,
    isLoading,
    error,
    refetch: loadWeather,
  };
}
