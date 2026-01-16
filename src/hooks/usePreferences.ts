import { useState, useEffect, useCallback } from 'react';
import { getPreferences, savePreferences } from '../services/storage';
import { DEFAULT_PREFERENCES } from '../constants';
import type { UserPreferences, TransportMode } from '../types';

export function usePreferences() {
  const [preferences, setPreferencesState] = useState<UserPreferences>(
    DEFAULT_PREFERENCES
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = getPreferences();
    setPreferencesState(stored);
    setIsLoaded(true);
  }, []);

  const updatePreferences = useCallback(
    (updates: Partial<UserPreferences>) => {
      setPreferencesState((prev) => {
        const next = { ...prev, ...updates };
        savePreferences(next);
        return next;
      });
    },
    []
  );

  const toggleTag = useCallback((tag: string) => {
    setPreferencesState((prev) => {
      const tags = prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag];
      const next = { ...prev, tags };
      savePreferences(next);
      return next;
    });
  }, []);

  const setRadius = useCallback((radiusMiles: number) => {
    updatePreferences({ radiusMiles });
  }, [updatePreferences]);

  const setTransportMode = useCallback((transportMode: TransportMode) => {
    updatePreferences({ transportMode });
  }, [updatePreferences]);

  const clearTags = useCallback(() => {
    updatePreferences({ tags: [] });
  }, [updatePreferences]);

  return {
    preferences,
    isLoaded,
    updatePreferences,
    toggleTag,
    setRadius,
    setTransportMode,
    clearTags,
  };
}
