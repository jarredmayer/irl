import { useProfile } from '../../hooks/useProfile';
import { getWeatherIcon } from '../../services/weather';
import type { WeatherForecast } from '../../types';

interface HeaderProps {
  weather?: WeatherForecast | null;
}

export function Header({ weather }: HeaderProps) {
  const { profile } = useProfile();

  // Get user initial for avatar
  const userInitial = profile.displayName?.[0]?.toUpperCase() || profile.handle?.[0]?.toUpperCase() || 'J';

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
              {userInitial}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
