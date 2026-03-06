import { useProfile } from '../../hooks/useProfile';
import { getWeatherIcon } from '../../services/weather';
import type { WeatherForecast } from '../../types';

interface HeaderProps {
  weather?: WeatherForecast | null;
}

export function Header({ weather }: HeaderProps) {
  const { profile } = useProfile();

  // Get user initial for avatar - only if displayName is set
  const userInitial = profile.displayName?.[0]?.toUpperCase();
  const hasDisplayName = Boolean(profile.displayName?.trim());

  // Get current weather (first hourly entry)
  const currentWeather = weather?.hourly?.[0];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[var(--color-divider)]">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Wordmark */}
          <div>
            <h1 className="font-wordmark bodoni-wordmark-sm text-[28px] font-bold text-ink leading-none tracking-tight">
              IRL
            </h1>
            <p
              className="text-[10px] font-medium text-ink-3 uppercase mt-0.5"
              style={{ letterSpacing: '0.14em' }}
            >
              Miami · Ft. Lauderdale · Palm Beach
            </p>
          </div>

          {/* Right: Weather + Avatar */}
          <div className="flex items-center gap-3">
            {/* Weather temp + icon */}
            {currentWeather && (
              <span className="flex items-center gap-1 text-sm text-ink-2">
                {getWeatherIcon(currentWeather.weatherCode)}
                <span className="font-medium">{Math.round(currentWeather.temperature)}°</span>
              </span>
            )}

            {/* Avatar */}
            <button className="w-8 h-8 rounded-full border border-ink flex items-center justify-center text-ink font-medium text-xs hover:bg-soft transition-colors btn-press">
              {hasDisplayName ? (
                userInitial
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
