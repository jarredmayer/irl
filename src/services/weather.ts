import {
  MIAMI_CENTER,
  WEATHER_CACHE_TTL_MS,
  STORAGE_KEYS,
  PRECIPITATION_THRESHOLD,
  WEATHER_CODES,
} from '../constants';
import type { WeatherForecast, HourlyWeather, UserLocation } from '../types';

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    precipitation_probability: number;
    weather_code: number;
    is_day: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
  };
  daily: {
    sunset: string[];
  };
}

interface CachedWeather {
  forecast: WeatherForecast;
  fetchedAt: number;
  locationKey: string;
}

function getLocationKey(lat: number, lng: number): string {
  // Round to 2 decimal places for caching (about 1km precision)
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

function getCachedWeather(locationKey: string): WeatherForecast | null {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.WEATHER_CACHE);
    if (!cached) return null;

    const data: CachedWeather = JSON.parse(cached);
    const now = Date.now();

    if (
      data.locationKey === locationKey &&
      now - data.fetchedAt < WEATHER_CACHE_TTL_MS
    ) {
      return data.forecast;
    }
    return null;
  } catch {
    return null;
  }
}

function setCachedWeather(
  forecast: WeatherForecast,
  locationKey: string
): void {
  try {
    const data: CachedWeather = {
      forecast,
      fetchedAt: Date.now(),
      locationKey,
    };
    localStorage.setItem(STORAGE_KEYS.WEATHER_CACHE, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to cache weather:', error);
  }
}

export async function fetchWeather(
  location?: UserLocation
): Promise<WeatherForecast> {
  const lat = location?.lat ?? MIAMI_CENTER.lat;
  const lng = location?.lng ?? MIAMI_CENTER.lng;
  const locationKey = getLocationKey(lat, lng);

  // Check cache first
  const cached = getCachedWeather(locationKey);
  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current: 'temperature_2m,precipitation_probability,weather_code,is_day',
    hourly: 'temperature_2m,precipitation_probability,weather_code',
    daily: 'sunset',
    timezone: 'America/New_York',
    forecast_days: '3',
    temperature_unit: 'fahrenheit',
  });

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`
  );

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();

  const hourly: HourlyWeather[] = data.hourly.time.map((time, i) => ({
    time,
    temperature: data.hourly.temperature_2m[i],
    precipitationProbability: data.hourly.precipitation_probability[i],
    weatherCode: data.hourly.weather_code[i],
  }));

  const forecast: WeatherForecast = {
    current: {
      temperature: data.current.temperature_2m,
      precipitationProbability: data.current.precipitation_probability,
      weatherCode: data.current.weather_code,
      isDay: data.current.is_day === 1,
    },
    hourly,
    sunset: data.daily.sunset[0],
    fetchedAt: Date.now(),
  };

  setCachedWeather(forecast, locationKey);
  return forecast;
}

export function getWeatherForTime(
  forecast: WeatherForecast,
  isoTime: string
): HourlyWeather | null {
  const targetTime = new Date(isoTime);
  const targetHour = targetTime.toISOString().slice(0, 13);

  return (
    forecast.hourly.find((h) => h.time.startsWith(targetHour)) ?? null
  );
}

export function willRainAtTime(
  forecast: WeatherForecast,
  isoTime: string
): boolean {
  const hourly = getWeatherForTime(forecast, isoTime);
  if (!hourly) return false;
  return hourly.precipitationProbability > PRECIPITATION_THRESHOLD;
}

export function getWeatherNote(forecast: WeatherForecast): string | null {
  const now = new Date();
  const tonight = new Date(now);
  tonight.setHours(20, 0, 0, 0);

  // Check if rain expected in next 6 hours
  const next6Hours = forecast.hourly.slice(0, 6);
  const rainHour = next6Hours.find(
    (h) => h.precipitationProbability > PRECIPITATION_THRESHOLD
  );

  if (rainHour) {
    const rainTime = new Date(rainHour.time);
    const hour = rainTime.getHours();
    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour > 12 ? hour - 12 : hour || 12;
    return `Rain expected after ${displayHour}${ampm} — indoor picks boosted`;
  }

  // Check for clear sunset
  const sunsetTime = new Date(forecast.sunset);
  const hoursUntilSunset = (sunsetTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (
    hoursUntilSunset > 0 &&
    hoursUntilSunset < 4 &&
    forecast.current.precipitationProbability < 20
  ) {
    const sunsetFormatted = sunsetTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `Clear sunset at ${sunsetFormatted} — outdoor picks highlighted`;
  }

  // Check for hot day
  if (forecast.current.temperature > 90) {
    return `High of ${Math.round(forecast.current.temperature)}°F — AC recommended`;
  }

  return null;
}

export function getWeatherIcon(weatherCode: number): string {
  if ((WEATHER_CODES.CLEAR as readonly number[]).includes(weatherCode)) return '☀️';
  if ((WEATHER_CODES.PARTLY_CLOUDY as readonly number[]).includes(weatherCode)) return '⛅';
  if ((WEATHER_CODES.FOGGY as readonly number[]).includes(weatherCode)) return '🌫️';
  if ((WEATHER_CODES.DRIZZLE as readonly number[]).includes(weatherCode)) return '🌦️';
  if ((WEATHER_CODES.RAIN as readonly number[]).includes(weatherCode)) return '🌧️';
  if ((WEATHER_CODES.SNOW as readonly number[]).includes(weatherCode)) return '❄️';
  if ((WEATHER_CODES.THUNDERSTORM as readonly number[]).includes(weatherCode)) return '⛈️';
  return '☁️';
}
