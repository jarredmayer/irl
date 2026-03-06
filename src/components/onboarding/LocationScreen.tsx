/**
 * Location Screen
 *
 * Screen 2 of onboarding - city selection or GPS location.
 */

import { useState, useEffect } from 'react';
import { setPreferences, getNearestCity, CITY_NAMES } from '../../store/preferences';

interface LocationScreenProps {
  onComplete: (city: 'miami' | 'ftl' | 'pb') => void;
}

type CityOption = 'miami' | 'ftl' | 'pb';

export function LocationScreen({ onComplete }: LocationScreenProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'denied'>('idle');
  const [gpsCity, setGpsCity] = useState<CityOption | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const handleCitySelect = (city: CityOption) => {
    setSelectedCity(city);
    setGpsStatus('idle');
    setGpsCity(null);
  };

  const handleUseLocation = () => {
    setGpsStatus('loading');
    setSelectedCity(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const nearest = getNearestCity(latitude, longitude);
        setGpsCity(nearest);
        setGpsStatus('success');
        setPreferences({ useGPS: true, locationSet: true, city: nearest });
      },
      () => {
        setGpsStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleContinue = () => {
    const city = gpsCity || selectedCity;
    if (!city) return;

    setPreferences({
      city,
      useGPS: gpsStatus === 'success',
      locationSet: true,
    });

    onComplete(city);
  };

  const canContinue = selectedCity !== null || gpsStatus === 'success';

  return (
    <div className="fixed inset-0 bg-white overflow-y-auto">
      <div
        className={`min-h-full flex flex-col px-6 py-12 transition-all duration-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {/* Header */}
        <div className="mb-8">
          <h2
            className="font-serif text-ink mb-2"
            style={{ fontSize: '24px', lineHeight: 1.3, fontWeight: 600 }}
          >
            Where are you based?
          </h2>
          <p className="text-ink-2 font-sans text-sm">
            We'll show you what's nearby.
          </p>
        </div>

        {/* City Buttons */}
        <div className="space-y-3 mb-4">
          {(['miami', 'ftl', 'pb'] as CityOption[]).map((city) => {
            const isSelected = selectedCity === city;
            return (
              <button
                key={city}
                onClick={() => handleCitySelect(city)}
                className={`w-full h-14 rounded-xl font-sans text-base font-medium transition-all duration-200 ${
                  isSelected
                    ? 'bg-[#0E0E0E] text-white'
                    : 'bg-white text-ink border border-ink'
                }`}
              >
                {CITY_NAMES[city]}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-ink-3 font-sans text-xs">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Use My Location Button */}
        <button
          onClick={handleUseLocation}
          disabled={gpsStatus === 'loading'}
          className={`w-full h-14 rounded-xl font-sans text-base font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
            gpsStatus === 'success'
              ? 'bg-[#0E0E0E] text-white'
              : 'bg-white text-ink border border-ink'
          } ${gpsStatus === 'loading' ? 'opacity-60' : ''}`}
        >
          {/* MapPin Icon */}
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
          {gpsStatus === 'loading' ? (
            'Finding location...'
          ) : gpsStatus === 'success' && gpsCity ? (
            `Using GPS — ${CITY_NAMES[gpsCity]}`
          ) : (
            'Use my location'
          )}
        </button>

        {/* GPS Denied Message */}
        {gpsStatus === 'denied' && (
          <p className="text-center text-[var(--color-ochre)] font-sans text-xs mt-3">
            Location denied — pick a city above
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={`w-full h-14 rounded-xl font-sans text-base font-medium transition-all duration-200 mt-8 ${
            canContinue
              ? 'bg-[#0E0E0E] text-white active:scale-[0.98]'
              : 'bg-[#0E0E0E] text-white opacity-40 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
