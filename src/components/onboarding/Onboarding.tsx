/**
 * Onboarding Flow
 *
 * First-run experience with 3 screens:
 * 1. Intro - Beautiful Miami image with IRL branding
 * 2. Vibe Selection - Pick your preferences
 * 3. The Reveal - Show matching events
 */

import { useState, useCallback } from 'react';
import { IntroScreen } from './IntroScreen';
import { VibeSelectionScreen } from './VibeSelectionScreen';
import { RevealScreen } from './RevealScreen';
import type { Event } from '../../types';

const ONBOARDING_COMPLETE_KEY = 'irl_onboarding_complete';
const ONBOARDING_VIBES_KEY = 'irl_onboarding_vibes';

export interface VibeOption {
  id: string;
  emoji: string;
  label: string;
  categories: string[];
  tags: string[];
}

export const VIBE_OPTIONS: VibeOption[] = [
  {
    id: 'rooftop-drinks',
    emoji: '🥂',
    label: 'rooftop drinks',
    categories: ['Nightlife'],
    tags: ['rooftop', 'cocktails', 'happy-hour'],
  },
  {
    id: 'sweaty-dance-floor',
    emoji: '🎧',
    label: 'sweaty dance floor',
    categories: ['Nightlife', 'Music'],
    tags: ['dancing', 'dj', 'electronic'],
  },
  {
    id: 'gallery-opening',
    emoji: '🖼️',
    label: 'gallery opening',
    categories: ['Art'],
    tags: ['art-gallery', 'museum'],
  },
  {
    id: 'sunday-market',
    emoji: '🌿',
    label: 'sunday market',
    categories: ['Community'],
    tags: ['food-market', 'local-favorite'],
  },
  {
    id: 'live-music',
    emoji: '🎸',
    label: 'live music',
    categories: ['Music'],
    tags: ['live-music', 'jazz', 'indie'],
  },
  {
    id: 'chefs-popup',
    emoji: '🍽️',
    label: "chef's pop-up",
    categories: ['Food & Drink'],
    tags: ['pop-up', 'food-market'],
  },
  {
    id: 'beach-bonfire',
    emoji: '🔥',
    label: 'beach bonfire',
    categories: ['Outdoors', 'Nightlife'],
    tags: ['beach', 'sunset'],
  },
  {
    id: 'outdoor-cinema',
    emoji: '🎬',
    label: 'outdoor cinema',
    categories: ['Outdoors', 'Art'],
    tags: ['outdoor-dining', 'sunset'],
  },
];

interface OnboardingProps {
  events: Event[];
  onComplete: (selectedVibes: string[]) => void;
}

export function Onboarding({ events, onComplete }: OnboardingProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [isExiting, setIsExiting] = useState(false);

  // Handle intro timeout or tap
  const handleIntroComplete = useCallback(() => {
    setCurrentScreen(1);
  }, []);

  // Handle vibe selection toggle
  const handleVibeToggle = useCallback((vibeId: string) => {
    setSelectedVibes((prev) =>
      prev.includes(vibeId)
        ? prev.filter((id) => id !== vibeId)
        : [...prev, vibeId]
    );
  }, []);

  // Handle vibe selection complete
  const handleVibeComplete = useCallback(() => {
    setCurrentScreen(2);
  }, []);

  // Handle final completion
  const handleFinalComplete = useCallback(() => {
    setIsExiting(true);
    // Store completion and vibes
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    localStorage.setItem(ONBOARDING_VIBES_KEY, JSON.stringify(selectedVibes));

    // Delay to allow exit animation
    setTimeout(() => {
      onComplete(selectedVibes);
    }, 300);
  }, [selectedVibes, onComplete]);

  // Simple seeded random for consistent but varied selection
  const seededRandom = useCallback((seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return () => {
      hash = (hash * 1103515245 + 12345) & 0x7fffffff;
      return hash / 0x7fffffff;
    };
  }, []);

  // Get matching events based on selected vibes
  const getMatchingEvents = useCallback(() => {
    // Deduplicate events by ID first
    const seenIds = new Set<string>();
    const uniqueEvents = events.filter((event) => {
      if (seenIds.has(event.id)) {
        return false;
      }
      seenIds.add(event.id);
      return true;
    });

    if (selectedVibes.length === 0) {
      // Return top 3 unique events if no vibes selected
      return uniqueEvents.slice(0, 3);
    }

    // Create seed from sorted vibes for consistent but varied selection
    const seed = [...selectedVibes].sort().join(',');
    const random = seededRandom(seed);

    // Get categories and tags from selected vibes
    const selectedOptions = VIBE_OPTIONS.filter((v) =>
      selectedVibes.includes(v.id)
    );
    const targetCategories = new Set(
      selectedOptions.flatMap((v) => v.categories)
    );
    const targetTags = new Set(selectedOptions.flatMap((v) => v.tags));

    // Score events by how well they match
    const scoredEvents = uniqueEvents.map((event) => {
      let matchScore = 0;

      // Category match
      if (targetCategories.has(event.category)) {
        matchScore += 2;
      }

      // Tag matches
      const tagMatches = event.tags.filter((tag) => targetTags.has(tag)).length;
      matchScore += tagMatches;

      // Bonus for editor picks
      if (event.editorPick) {
        matchScore += 1;
      }

      // Add seeded random tiebreaker for variation
      const tiebreaker = random() * 0.9;

      return { event, matchScore, tiebreaker };
    });

    // Sort by match score (highest first), then by tiebreaker for variation
    scoredEvents.sort((a, b) => {
      const scoreDiff = b.matchScore - a.matchScore;
      if (Math.abs(scoreDiff) < 0.5) {
        // Same score tier: use tiebreaker for variation
        return b.tiebreaker - a.tiebreaker;
      }
      return scoreDiff;
    });

    // Get top 3 matching events with deduplication
    const result: Event[] = [];
    const resultIds = new Set<string>();

    // First, add events that actually match the vibes (matchScore > 0)
    for (const { event, matchScore } of scoredEvents) {
      if (result.length >= 3) break;
      if (matchScore > 0 && !resultIds.has(event.id)) {
        result.push(event);
        resultIds.add(event.id);
      }
    }

    // If we don't have 3 events yet, fill with top-ranked events from any category
    if (result.length < 3) {
      for (const { event } of scoredEvents) {
        if (result.length >= 3) break;
        if (!resultIds.has(event.id)) {
          result.push(event);
          resultIds.add(event.id);
        }
      }
    }

    // Guard: verify all 3 event IDs are unique
    const finalIds = result.map((e) => e.id);
    const uniqueFinalIds = new Set(finalIds);
    if (uniqueFinalIds.size !== finalIds.length) {
      console.warn('Onboarding reveal: duplicate event IDs detected, force-deduplicating');
      const deduped: Event[] = [];
      const dedupedIds = new Set<string>();
      for (const event of result) {
        if (!dedupedIds.has(event.id)) {
          deduped.push(event);
          dedupedIds.add(event.id);
        }
      }
      return deduped;
    }

    return result;
  }, [events, selectedVibes, seededRandom]);

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {currentScreen === 0 && (
        <IntroScreen onComplete={handleIntroComplete} />
      )}

      {currentScreen === 1 && (
        <VibeSelectionScreen
          selectedVibes={selectedVibes}
          onVibeToggle={handleVibeToggle}
          onComplete={handleVibeComplete}
        />
      )}

      {currentScreen === 2 && (
        <RevealScreen
          events={getMatchingEvents()}
          onComplete={handleFinalComplete}
        />
      )}
    </div>
  );
}

/**
 * Check if onboarding has been completed
 */
export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
}

/**
 * Get stored vibe selections
 */
export function getStoredVibes(): string[] {
  try {
    const stored = localStorage.getItem(ONBOARDING_VIBES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Map vibes to preference tags
 */
export function mapVibesToPreferences(vibeIds: string[]): {
  tags: string[];
  categories: string[];
} {
  const selectedOptions = VIBE_OPTIONS.filter((v) => vibeIds.includes(v.id));
  const tags = [...new Set(selectedOptions.flatMap((v) => v.tags))];
  const categories = [...new Set(selectedOptions.flatMap((v) => v.categories))];
  return { tags, categories };
}

/**
 * Reset onboarding (for testing)
 */
export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
  localStorage.removeItem(ONBOARDING_VIBES_KEY);
}
