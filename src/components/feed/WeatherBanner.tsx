import { useMemo } from 'react';
import type { WeatherForecast } from '../../types';

interface WeatherBannerProps {
  weather: WeatherForecast | null;
  onDismiss?: () => void;
}

interface WeatherSuggestion {
  icon: string;
  message: string;
  subtext: string;
  bgColor: string;
  textColor: string;
}

function getWeatherSuggestion(weather: WeatherForecast): WeatherSuggestion | null {
  const current = weather.hourly[0];
  if (!current) return null;

  const now = new Date();
  const hour = now.getHours();

  // Find weather around sunset (5-8pm)
  const eveningWeather = weather.hourly.find(h => {
    const hDate = new Date(h.time);
    return hDate.getHours() >= 17 && hDate.getHours() <= 20;
  });

  // Check for rain in next few hours
  const upcomingRain = weather.hourly.slice(0, 6).find(h => h.precipitationProbability > 50);

  // Rain warning takes priority
  if (upcomingRain) {
    const rainTime = new Date(upcomingRain.time);
    const rainHour = rainTime.getHours();
    const timeStr = rainHour > 12 ? `${rainHour - 12}pm` : `${rainHour}am`;

    return {
      icon: '🌧️',
      message: `Rain expected around ${timeStr}`,
      subtext: 'Indoor events recommended',
      bgColor: 'var(--color-slate)',
      textColor: 'white',
    };
  }

  // Clear evening for outdoor activities
  if (eveningWeather && eveningWeather.precipitationProbability < 20 && hour < 17) {
    const temp = Math.round(eveningWeather.temperature);
    return {
      icon: '🌅',
      message: `${temp}° and clear tonight`,
      subtext: 'Good evening for outdoor plans',
      bgColor: 'var(--color-ochre)',
      textColor: 'white',
    };
  }

  // Hot day warning
  if (current.temperature > 90) {
    return {
      icon: '🥵',
      message: `High of ${Math.round(current.temperature)}° today`,
      subtext: 'Stay cool with indoor events',
      bgColor: 'var(--color-burgundy)',
      textColor: 'white',
    };
  }

  // Beautiful weather
  if (current.temperature >= 70 && current.temperature <= 85 && current.precipitationProbability < 20) {
    return {
      icon: '☀️',
      message: 'Beautiful day outside',
      subtext: `${Math.round(current.temperature)}° and clear`,
      bgColor: 'var(--color-teal)',
      textColor: 'white',
    };
  }

  // Cool morning for outdoor activities
  if (hour < 10 && current.temperature < 75) {
    return {
      icon: '🌤️',
      message: 'Great morning for outdoor events',
      subtext: `${Math.round(current.temperature)}° right now`,
      bgColor: 'var(--color-teal)',
      textColor: 'white',
    };
  }

  return null;
}

export function WeatherBanner({ weather, onDismiss }: WeatherBannerProps) {
  const suggestion = useMemo(() => {
    if (!weather) return null;
    return getWeatherSuggestion(weather);
  }, [weather]);

  if (!suggestion) return null;

  return (
    <div
      className="mx-4 mt-2 mb-3 rounded-[16px] overflow-hidden card-shadow animate-fade-in"
      style={{ backgroundColor: suggestion.bgColor }}
    >
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{suggestion.icon}</span>
          <div>
            <p className="font-medium" style={{ color: suggestion.textColor }}>
              {suggestion.message}
            </p>
            <p className="text-sm opacity-90" style={{ color: suggestion.textColor }}>
              {suggestion.subtext}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
            style={{ color: suggestion.textColor }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
