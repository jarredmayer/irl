/**
 * Reveal Screen
 *
 * Shows 3 matching events with staggered animation.
 * Displays derived interest tags from selected vibes.
 */

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { CATEGORY_COLORS } from '../../constants';
import { vibesToInterests } from '../../store/preferences';
import { VIBE_OPTIONS } from './Onboarding';
import type { Event } from '../../types';

interface RevealScreenProps {
  events: Event[];
  selectedVibes: string[];
  city: 'miami' | 'ftl' | 'pb' | null;
  onComplete: () => void;
}

export function RevealScreen({ events, selectedVibes, onComplete }: RevealScreenProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [visibleCards, setVisibleCards] = useState<number[]>([]);

  // Derive interest tags from selected vibes
  const derivedInterests = useMemo(() => {
    const vibeLabels = selectedVibes.map(id => {
      const vibe = VIBE_OPTIONS.find(v => v.id === id);
      return vibe?.label || id;
    });
    return vibesToInterests(vibeLabels);
  }, [selectedVibes]);

  useEffect(() => {
    // Fade in header
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Staggered card reveal: 400ms, 900ms, 1400ms
    const timers = [
      setTimeout(() => setVisibleCards((prev) => [...prev, 0]), 400),
      setTimeout(() => setVisibleCards((prev) => [...prev, 1]), 900),
      setTimeout(() => setVisibleCards((prev) => [...prev, 2]), 1400),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  const getCategoryColor = (category: string) => {
    const colorInfo = CATEGORY_COLORS[category];
    return colorInfo?.accent || '#3D5068';
  };

  const formatEventDate = (startAt: string) => {
    const date = new Date(startAt);
    const dayName = format(date, 'EEEE');
    const time = format(date, 'h:mm a');
    return `${dayName} at ${time}`;
  };

  return (
    <div className="fixed inset-0 bg-white overflow-y-auto">
      <div className="min-h-full flex flex-col px-6 py-12">
        {/* Header */}
        <div
          className={`mb-8 transition-all duration-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <p className="text-ink-3 font-sans text-sm mb-2">
            did you know about these?
          </p>
          <h2
            className="font-serif text-ink italic"
            style={{ fontSize: '28px', lineHeight: 1.3 }}
          >
            3 things happening this weekend you probably haven't heard about.
          </h2>
        </div>

        {/* Event Cards */}
        <div className="space-y-4 mb-8 flex-1">
          {events.slice(0, 3).map((event, index) => {
            const isCardVisible = visibleCards.includes(index);
            const categoryColor = getCategoryColor(event.category);
            const isUnderTheRadar = index === 1; // Mark the second one as "under the radar"

            return (
              <div
                key={event.id}
                className={`relative bg-slate-50 rounded-2xl overflow-hidden transition-all duration-500 ${
                  isCardVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                }`}
              >
                <div className="flex gap-4 p-4">
                  {/* Image */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-200">
                    {event.image ? (
                      <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-3xl"
                        style={{ backgroundColor: `${categoryColor}15` }}
                      >
                        {CATEGORY_COLORS[event.category]?.emoji || '📅'}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Under the radar tag */}
                    {isUnderTheRadar && (
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider mb-1"
                        style={{
                          backgroundColor: '#7B61FF15',
                          color: '#7B61FF',
                        }}
                      >
                        under the radar
                      </span>
                    )}

                    {/* Title */}
                    <h3 className="font-serif text-ink text-[15px] leading-tight mb-1 line-clamp-2">
                      {event.title}
                    </h3>

                    {/* Category swatch + date */}
                    <div className="flex items-center gap-2 text-xs text-ink-3">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: categoryColor }}
                      />
                      <span>{event.category}</span>
                      <span>·</span>
                      <span>{formatEventDate(event.startAt)}</span>
                    </div>

                    {/* Venue */}
                    {event.venueName && (
                      <p className="text-xs text-ink-3 mt-1 truncate">
                        {event.venueName}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interest Tags Confirmation */}
        {derivedInterests.length > 0 && (
          <div
            className="mb-6 transition-all duration-500"
            style={{
              opacity: visibleCards.length === 3 ? 1 : 0,
              transform: `translateY(${visibleCards.length === 3 ? 0 : 20}px)`,
              transition: 'all 0.3s ease-out 0.1s',
            }}
          >
            <p
              className="font-sans text-ink-3 uppercase mb-2"
              style={{ fontSize: '11px', letterSpacing: '0.08em', fontWeight: 500 }}
            >
              You're into:
            </p>
            <div className="flex flex-wrap gap-2">
              {derivedInterests.map((interest) => (
                <span
                  key={interest}
                  className="bg-soft rounded-full px-3 py-1 font-sans text-ink"
                  style={{ fontSize: '13px', fontWeight: 500 }}
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={onComplete}
          className="w-full py-4 bg-[#0E0E0E] text-white rounded-2xl font-sans text-base font-medium transition-all duration-200 active:scale-[0.98]"
          style={{
            opacity: visibleCards.length === 3 ? 1 : 0,
            transform: `translateY(${visibleCards.length === 3 ? 0 : 20}px)`,
            transition: 'all 0.3s ease-out',
          }}
        >
          Enter IRL →
        </button>
      </div>
    </div>
  );
}
