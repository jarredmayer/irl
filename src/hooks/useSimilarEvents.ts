import { useMemo } from 'react';
import {
  findSimilarEvents,
  findRecommendationsFromSaved,
} from '../services/ranking';
import type { Event } from '../types';

interface UseSimilarEventsOptions {
  allEvents: Event[];
  savedEvents?: Event[];
}

export function useSimilarEvents(options: UseSimilarEventsOptions) {
  const { allEvents, savedEvents = [] } = options;

  // Get similar events for a specific event
  const getSimilarEvents = useMemo(() => {
    return (targetEvent: Event, limit: number = 5): Event[] => {
      return findSimilarEvents(targetEvent, allEvents, limit);
    };
  }, [allEvents]);

  // Get recommendations based on all saved events
  const recommendations = useMemo(() => {
    if (savedEvents.length === 0) {
      return [];
    }
    return findRecommendationsFromSaved(savedEvents, allEvents, 10);
  }, [allEvents, savedEvents]);

  // Get "You might also like" suggestions for a category
  const getEventsByCategory = useMemo(() => {
    return (category: string, limit: number = 5): Event[] => {
      const now = new Date();
      return allEvents
        .filter((event) => {
          const eventDate = new Date(event.startAt);
          return eventDate > now && event.category === category;
        })
        .slice(0, limit);
    };
  }, [allEvents]);

  return {
    getSimilarEvents,
    recommendations,
    getEventsByCategory,
    hasRecommendations: recommendations.length > 0,
  };
}
