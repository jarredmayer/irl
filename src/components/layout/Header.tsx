import { getWeatherIcon } from '../../services/weather';
import type { WeatherForecast } from '../../types';

interface HeaderProps {
  weatherNote?: string | null;
  weather?: WeatherForecast | null;
}

export function Header({ weatherNote, weather }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-100">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-sky-500 to-violet-500 bg-clip-text text-transparent">
            irl.
          </h1>
          <div className="flex items-center gap-3">
            {weather && (
              <div className="flex items-center gap-1.5 text-sm text-slate-600">
                <span>{getWeatherIcon(weather.current.weatherCode)}</span>
                <span className="font-medium">{Math.round(weather.current.temperature)}°</span>
              </div>
            )}
            <span className="text-sm text-slate-500">Miami / FLL</span>
          </div>
        </div>
      </div>
      {weatherNote && (
        <div className="px-4 py-2 bg-gradient-to-r from-sky-50 to-violet-50 border-t border-sky-100">
          <p className="text-sm text-sky-700">{weatherNote}</p>
        </div>
      )}
    </header>
  );
}
