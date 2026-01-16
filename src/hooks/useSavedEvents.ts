import { useState, useEffect, useCallback } from 'react';
import {
  getSavedEventIds,
  saveEventId,
  unsaveEventId,
} from '../services/storage';

export function useSavedEvents() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = getSavedEventIds();
    setSavedIds(stored);
    setIsLoaded(true);
  }, []);

  const saveEvent = useCallback((eventId: string) => {
    saveEventId(eventId);
    setSavedIds((prev) => {
      if (prev.includes(eventId)) return prev;
      return [...prev, eventId];
    });
  }, []);

  const unsaveEvent = useCallback((eventId: string) => {
    unsaveEventId(eventId);
    setSavedIds((prev) => prev.filter((id) => id !== eventId));
  }, []);

  const toggleSaved = useCallback(
    (eventId: string) => {
      if (savedIds.includes(eventId)) {
        unsaveEvent(eventId);
      } else {
        saveEvent(eventId);
      }
    },
    [savedIds, saveEvent, unsaveEvent]
  );

  const isSaved = useCallback(
    (eventId: string) => savedIds.includes(eventId),
    [savedIds]
  );

  return {
    savedIds,
    isLoaded,
    saveEvent,
    unsaveEvent,
    toggleSaved,
    isSaved,
  };
}
