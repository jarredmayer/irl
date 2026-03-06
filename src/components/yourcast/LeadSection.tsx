import { useNavigate } from 'react-router-dom';
import { formatEventDate, formatEventTime } from '../../utils/time';
import { getWeatherForTime, getWeatherIcon } from '../../services/weather';
import { CATEGORY_COLORS } from '../../constants';
import type { ScoredEvent, WeatherForecast } from '../../types';

interface LeadSectionProps {
  event: ScoredEvent;
  isSaved?: boolean;
  onSave?: (eventId: string) => void;
  weather?: WeatherForecast | null;
  leadIntro?: string;
}

export function LeadSection({ event, isSaved = false, onSave, weather, leadIntro }: LeadSectionProps) {
  const navigate = useNavigate();
  const cat = CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS['Other'];
  const eventWeather = weather ? getWeatherForTime(weather, event.startAt) : null;

  // Use provided intro or fallback
  const editorialContext = leadIntro || "Top pick for tonight.";

  const handleClick = () => {
    navigate(`/event/${event.id}`);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if ('vibrate' in navigator) navigator.vibrate(10);
    onSave?.(event.id);
  };

  return (
    <section className="px-4 py-6">
      {/* Section label */}
      <p className="text-xs font-bold tracking-[0.15em] uppercase text-ink-3 mb-3">
        THE LEAD
      </p>

      {/* Lead card */}
      <div
        onClick={handleClick}
        className="bg-white rounded-[22px] overflow-hidden card-shadow cursor-pointer transition-transform active:scale-[0.98]"
      >
        {/* Cinematic image */}
        {event.image && (
          <div className="relative aspect-[16/9]">
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Category dot on image */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cat.accent }}
              />
              <span className="text-xs font-medium text-white uppercase tracking-wide">
                {event.category}
              </span>
            </div>

            {/* Save button on image */}
            <button
              onClick={handleSave}
              className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${
                isSaved
                  ? 'bg-rose-500 text-white'
                  : 'bg-white/20 text-white backdrop-blur-sm hover:bg-white/30'
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h2 className="font-serif text-[22px] text-ink leading-tight mb-2">
            {event.title}
          </h2>

          {/* Editorial context */}
          <p className="text-ink-2 text-base leading-relaxed mb-4 italic">
            {editorialContext}
          </p>

          {/* Date/time/weather row */}
          <div className="flex items-center gap-3 text-sm text-ink-2">
            {/* Date */}
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span>{formatEventDate(event.startAt, event.timezone)}</span>
            </div>

            {/* Time */}
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <span>{formatEventTime(event.startAt, event.timezone)}</span>
            </div>

            {/* Weather */}
            {eventWeather && (
              <div className="flex items-center gap-1.5">
                <span>{getWeatherIcon(eventWeather.weatherCode)}</span>
                <span>{Math.round(eventWeather.temperature)}°</span>
              </div>
            )}
          </div>

          {/* Venue/location */}
          {(event.venueName || event.neighborhood) && (
            <p className="text-sm text-ink-3 mt-2">
              {event.venueName ? `${event.venueName} · ` : ''}{event.neighborhood}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
