import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWeatherIcon } from '../../services/weather';
import { getCategorySwatchColor } from '../../utils/category';
import { generateEventImage, getFallbackImage } from '../../agents/image-agent';
import type { ScoredEvent, HourlyWeather } from '../../types';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface HeroCardProps {
  event: ScoredEvent;
  weather?: HourlyWeather;
  onSave?: (eventId: string) => void;
  isSaved?: boolean;
}

// Format date like "SAT MAR 8 · 7 PM"
function formatDateDisplay(startAt: string, timezone: string): string {
  const date = toZonedTime(new Date(startAt), timezone);
  const dayOfWeek = format(date, 'EEE').toUpperCase();
  const month = format(date, 'MMM').toUpperCase();
  const day = format(date, 'd');
  const time = format(date, 'h a').replace(':00', '');
  return `${dayOfWeek} ${month} ${day} · ${time}`;
}

export function HeroCard({
  event,
  weather,
  onSave,
  isSaved = false,
}: HeroCardProps) {
  const navigate = useNavigate();
  const [showSaveAnimation, setShowSaveAnimation] = useState(false);

  // Image state: start with existing image or fallback for instant render
  const [imgUrl, setImgUrl] = useState<string>(
    () => event.image || getFallbackImage(event.category, event.id)
  );

  // Fetch better image if none exists
  useEffect(() => {
    if (!event.image) {
      generateEventImage(event).then(setImgUrl);
    } else {
      setImgUrl(event.image);
    }
  }, [event]);

  const swatchColor = getCategorySwatchColor(event.category);

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

  return (
    <article
      onClick={handleClick}
      className="relative w-full cursor-pointer overflow-hidden"
      style={{ height: '280px' }}
    >
      {/* Background image - always show since we have fallback */}
      <img
        src={imgUrl}
        alt={event.title}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(14,14,14,0.45) 50%, rgba(14,14,14,0.85) 100%)',
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
      <div className="relative h-full flex flex-col justify-between p-5">
        {/* TOP LEFT: IRL wordmark */}
        <div>
          <h1 className="font-wordmark bodoni-wordmark-lg text-[36px] font-bold text-white leading-none tracking-tight">
            IRL
          </h1>
        </div>

        {/* BOTTOM: Event info */}
        <div>
          {/* Category swatch + label */}
          <div className="flex items-center gap-1.5 mb-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: swatchColor }}
            />
            <span className="text-[12px] font-medium text-white/80 uppercase tracking-wide">
              {event.category}
            </span>
          </div>

          {/* Event title */}
          <h2
            className="font-serif text-[22px] text-white leading-snug mb-3"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {event.title}
          </h2>

          {/* Date/time + weather row */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-white/80 uppercase tracking-wide">
              {formatDateDisplay(event.startAt, event.timezone)}
            </span>
            {weather && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/15 backdrop-blur-sm rounded-full text-xs text-white">
                {getWeatherIcon(weather.weatherCode)} {Math.round(weather.temperature)}°
              </span>
            )}
          </div>
        </div>

        {/* Save button (absolute, bottom-right) */}
        {onSave && (
          <button
            onClick={handleSave}
            className={`absolute bottom-5 right-5 w-8 h-8 rounded-full flex items-center justify-center transition-all btn-press ${
              isSaved
                ? 'bg-white text-ink'
                : 'border border-white/60 text-white hover:bg-white/10'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        )}
      </div>
    </article>
  );
}

export function HeroCardSkeleton() {
  return (
    <div className="relative w-full bg-ink/10 animate-pulse" style={{ height: '280px' }}>
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 100%)' }}
      />
      <div className="relative h-full flex flex-col justify-between p-5">
        <div>
          <div className="h-9 w-16 bg-white/20 rounded" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-3 h-3 rounded-full bg-white/20" />
            <div className="h-3 w-12 bg-white/20 rounded" />
          </div>
          <div className="h-6 w-3/4 bg-white/20 rounded mb-2" />
          <div className="h-6 w-1/2 bg-white/20 rounded mb-3" />
          <div className="h-4 w-32 bg-white/20 rounded" />
        </div>
      </div>
    </div>
  );
}
