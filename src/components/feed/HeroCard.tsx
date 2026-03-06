import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWeatherIcon } from '../../services/weather';
import type { ScoredEvent, HourlyWeather } from '../../types';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface HeroCardProps {
  event: ScoredEvent;
  weather?: HourlyWeather;
  onSave?: (eventId: string) => void;
  isSaved?: boolean;
}

// Format date like "SAT  MAR 8  ·  7 PM"
function formatDateDisplay(startAt: string, timezone: string): string {
  const date = toZonedTime(new Date(startAt), timezone);
  const dayOfWeek = format(date, 'EEE').toUpperCase();
  const month = format(date, 'MMM').toUpperCase();
  const day = format(date, 'd');
  const time = format(date, 'h a').replace(':00', '');
  return `${dayOfWeek}  ${month} ${day}  ·  ${time}`;
}

export function HeroCard({
  event,
  weather,
  onSave,
  isSaved = false,
}: HeroCardProps) {
  const navigate = useNavigate();
  const [showSaveAnimation, setShowSaveAnimation] = useState(false);

  const handleClick = () => {
    navigate(`/event/${event.id}`);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSave) {
      if ('vibrate' in navigator) navigator.vibrate(10);
      setShowSaveAnimation(true);
      onSave(event.id);
      setTimeout(() => setShowSaveAnimation(false), 600);
    }
  };

  // Use a fallback gradient if no image
  const hasImage = !!event.image;

  return (
    <article
      onClick={handleClick}
      className="relative w-full cursor-pointer overflow-hidden"
      style={{ minHeight: '420px' }}
    >
      {/* Background image */}
      {hasImage ? (
        <img
          src={event.image}
          alt={event.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-burgundy)] to-[var(--color-fig)]" />
      )}

      {/* Dark gradient overlay - bottom 60% */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.2) 60%, transparent 100%)',
        }}
      />

      {/* Save animation overlay */}
      {showSaveAnimation && (
        <div className="absolute inset-0 bg-white/20 flex items-center justify-center z-10 animate-fade-in pointer-events-none">
          <div className="animate-bounce-save">
            <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end p-5 md:p-6" style={{ minHeight: '420px' }}>
        {/* IRL wordmark at top */}
        <div className="absolute top-5 left-5 md:top-6 md:left-6">
          <h1 className="font-wordmark text-[64px] md:text-[80px] font-black text-white leading-none tracking-tight">
            IRL
          </h1>
        </div>

        {/* Bottom content */}
        <div className="mt-auto">
          {/* Date/location metadata */}
          <p className="text-xs md:text-sm font-medium text-white/70 uppercase tracking-wider mb-2">
            {formatDateDisplay(event.startAt, event.timezone)}
            <span className="mx-2">·</span>
            {event.neighborhood}
          </p>

          {/* Event title */}
          <h2 className="font-serif text-2xl md:text-4xl text-white leading-tight mb-4 line-clamp-3">
            {event.title}
          </h2>

          {/* Bottom row: weather badge + save button */}
          <div className="flex items-center justify-between">
            {/* Weather badge */}
            <div className="flex items-center gap-3">
              {weather && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white border border-white/20">
                  {getWeatherIcon(weather.weatherCode)} {Math.round(weather.temperature)}°
                </span>
              )}
              {event.priceLabel && (
                <span className="text-sm font-medium text-white/80">
                  {event.priceLabel === 'Free' ? 'Free' : event.priceLabel}
                </span>
              )}
            </div>

            {/* Save button */}
            {onSave && (
              <button
                onClick={handleSave}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all btn-press ${
                  isSaved
                    ? 'bg-white text-ink'
                    : 'border border-white/60 text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5}>
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                {isSaved ? 'Saved' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function HeroCardSkeleton() {
  return (
    <div className="relative w-full bg-[var(--color-bg-soft)] animate-pulse" style={{ minHeight: '420px' }}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 100%)' }} />
      <div className="relative h-full flex flex-col justify-end p-5 md:p-6" style={{ minHeight: '420px' }}>
        <div className="absolute top-5 left-5">
          <div className="h-16 w-24 bg-white/20 rounded" />
        </div>
        <div className="mt-auto">
          <div className="h-4 w-32 bg-white/20 rounded mb-2" />
          <div className="h-8 w-3/4 bg-white/20 rounded mb-2" />
          <div className="h-8 w-1/2 bg-white/20 rounded mb-4" />
          <div className="flex justify-between">
            <div className="h-8 w-20 bg-white/20 rounded-full" />
            <div className="h-8 w-20 bg-white/20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
