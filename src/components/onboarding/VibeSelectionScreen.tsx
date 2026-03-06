/**
 * Vibe Selection Screen
 *
 * 8-option grid for selecting preferences.
 * Maps to categories and tags for filtering.
 */

import { useState, useEffect } from 'react';
import { VIBE_OPTIONS, type VibeOption } from './Onboarding';
import { CATEGORY_COLORS } from '../../constants';

interface VibeSelectionScreenProps {
  selectedVibes: string[];
  onVibeToggle: (vibeId: string) => void;
  onComplete: () => void;
}

// Get accent color for a vibe based on its primary category
function getVibeColor(vibe: VibeOption): string {
  const primaryCategory = vibe.categories[0];
  const colorInfo = CATEGORY_COLORS[primaryCategory];
  return colorInfo?.accent || '#2E6560';
}

export function VibeSelectionScreen({
  selectedVibes,
  onVibeToggle,
  onComplete,
}: VibeSelectionScreenProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in on mount
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const hasSelection = selectedVibes.length > 0;

  return (
    <div className="fixed inset-0 bg-white overflow-y-auto">
      <div
        className={`min-h-full flex flex-col px-6 py-12 transition-all duration-500 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {/* Header */}
        <div className="mb-8">
          <p className="text-ink-3 font-sans text-sm mb-2">
            your friday night looks like...
          </p>
          <h2
            className="font-serif text-ink"
            style={{ fontSize: '28px', lineHeight: 1.2 }}
          >
            Pick everything that fits.
          </h2>
        </div>

        {/* Vibe Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8 flex-1">
          {VIBE_OPTIONS.map((vibe, index) => {
            const isSelected = selectedVibes.includes(vibe.id);
            const accentColor = getVibeColor(vibe);

            return (
              <button
                key={vibe.id}
                onClick={() => onVibeToggle(vibe.id)}
                className={`relative p-4 rounded-2xl text-left transition-all duration-200 active:scale-[0.98] ${
                  isSelected
                    ? 'border-2 shadow-sm'
                    : 'border border-slate-200 hover:border-slate-300'
                }`}
                style={{
                  borderColor: isSelected ? accentColor : undefined,
                  backgroundColor: isSelected ? `${accentColor}08` : undefined,
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {/* Emoji */}
                <span className="text-2xl mb-2 block">{vibe.emoji}</span>

                {/* Label */}
                <span
                  className={`font-sans text-sm leading-tight block ${
                    isSelected ? 'text-ink font-medium' : 'text-ink-2'
                  }`}
                >
                  {vibe.label}
                </span>

                {/* Checkmark */}
                {isSelected && (
                  <div
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: accentColor }}
                  >
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selection count */}
        <p className="text-center text-ink-3 text-sm mb-4">
          {selectedVibes.length === 0
            ? 'Select at least one to continue'
            : `${selectedVibes.length} selected`}
        </p>

        {/* CTA Button */}
        <button
          onClick={onComplete}
          disabled={!hasSelection}
          className={`w-full py-4 rounded-2xl font-sans text-base font-medium transition-all duration-200 ${
            hasSelection
              ? 'bg-ink text-white active:scale-[0.98]'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          Show me what's out there →
        </button>
      </div>
    </div>
  );
}
