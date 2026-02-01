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
  gradient: string;
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
      gradient: 'from-slate-600 to-slate-700',
      textColor: 'text-white',
    };
  }

  // Clear evening for outdoor activities
  if (eveningWeather && eveningWeather.precipitationProbability < 20 && hour < 17) {
    return {
      icon: '🌅',
      message: 'Perfect evening ahead',
      subtext: `Clear skies, ${Math.round(eveningWeather.temperature)}° at sunset`,
      gradient: 'from-orange-400 to-rose-500',
      textColor: 'text-white',
    };
  }

  // Hot day warning
  if (current.temperature > 90) {
    return {
      icon: '🥵',
      message: `High of ${Math.round(current.temperature)}° today`,
      subtext: 'Stay cool with indoor events',
      gradient: 'from-red-400 to-orange-500',
      textColor: 'text-white',
    };
  }

  // Beautiful weather
  if (current.temperature >= 70 && current.temperature <= 85 && current.precipitationProbability < 20) {
    return {
      icon: '☀️',
      message: 'Beautiful day outside',
      subtext: `${Math.round(current.temperature)}° and clear`,
      gradient: 'from-sky-400 to-blue-500',
      textColor: 'text-white',
    };
  }

  // Cool morning for outdoor activities
  if (hour < 10 && current.temperature < 75) {
    return {
      icon: '🌤️',
      message: 'Great morning for outdoor events',
      subtext: `${Math.round(current.temperature)}° right now`,
      gradient: 'from-emerald-400 to-teal-500',
      textColor: 'text-white',
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
    <div className={`mx-4 mb-3 rounded-xl overflow-hidden bg-gradient-to-r ${suggestion.gradient} shadow-md animate-fade-in`}>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{suggestion.icon}</span>
          <div>
            <p className={`font-semibold ${suggestion.textColor}`}>
              {suggestion.message}
            </p>
            <p className={`text-sm ${suggestion.textColor} opacity-90`}>
              {suggestion.subtext}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`p-1.5 rounded-full hover:bg-white/20 transition-colors ${suggestion.textColor}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
