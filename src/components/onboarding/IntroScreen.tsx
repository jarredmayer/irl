/**
 * Intro Screen
 *
 * Full screen with beautiful Miami image, IRL branding.
 * Auto-advances after 2 seconds or on tap.
 */

import { useEffect, useState } from 'react';

interface IntroScreenProps {
  onComplete: () => void;
}

// Beautiful Miami event image from Unsplash
const INTRO_IMAGE =
  'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=1200&h=800&fit=crop&auto=format';

export function IntroScreen({ onComplete }: IntroScreenProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in on mount
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto-advance after 2 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 cursor-pointer"
      onClick={onComplete}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onComplete()}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${INTRO_IMAGE})`,
        }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content */}
      <div
        className={`relative z-10 h-full flex flex-col items-center justify-center px-6 transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {/* IRL Logo */}
        <h1
          className="font-wordmark text-white text-center mb-4"
          style={{
            fontSize: '96px',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            textShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}
        >
          IRL
        </h1>

        {/* Tagline */}
        <p
          className="font-wordmark italic text-white/90 text-center mb-6"
          style={{
            fontSize: '24px',
            fontWeight: 400,
          }}
        >
          your city, curated
        </p>

        {/* Cities */}
        <p
          className="font-sans text-white/50 text-center uppercase tracking-[0.25em] mb-12"
          style={{
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          Miami · Fort Lauderdale
        </p>

        {/* CTA Button */}
        <button
          className="px-8 py-3 border-2 border-white/80 text-white rounded-full font-sans text-sm font-medium tracking-wide transition-all duration-200 hover:bg-white/10 active:scale-95"
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
        >
          Find your weekend →
        </button>

        {/* Tap hint */}
        <p className="absolute bottom-8 text-white/40 text-xs font-sans">
          tap anywhere to continue
        </p>
      </div>
    </div>
  );
}
