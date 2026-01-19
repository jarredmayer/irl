import { useState, useEffect, useMemo } from 'react';
import { rankEvents, filterByDistance } from '../services/ranking';
import { filterEventsByTime, getTimeSection, isEventPast } from '../utils/time';
import miamiEvents from '../data/events.miami.json';
import fllEvents from '../data/events.fll.json';
import type {
  Event,
  ScoredEvent,
  FilterState,
  RankingContext,
  UserPreferences,
  UserLocation,
  WeatherForecast,
} from '../types';

interface UseEventsOptions {
  preferences: UserPreferences;
  location?: UserLocation | null;
  weather?: WeatherForecast | null;
  filters: FilterState;
}

interface GroupedEvents {
  tonight: ScoredEvent[];
  tomorrow: ScoredEvent[];
  thisWeekend: ScoredEvent[];
  nextWeek: ScoredEvent[];
  worthPlanning: ScoredEvent[];
}

export function useEvents(options: UseEventsOptions) {
  const { preferences, location, weather, filters } = options;
  const [allEvents, setAllEvents] = useState<Event[]>([]);

  useEffect(() => {
    // Combine events from both cities
    const combined = [...(miamiEvents as Event[]), ...(fllEvents as Event[])];
    // Filter out past events
    const upcoming = combined.filter((e) => !isEventPast(e.startAt));
    setAllEvents(upcoming);
  }, []);

  const rankedEvents = useMemo(() => {
    const now = new Date();
    const context: RankingContext = {
      location: location || undefined,
      preferences,
      weather: weather || undefined,
      now,
    };

    return rankEvents(allEvents, context);
  }, [allEvents, preferences, location, weather]);

  const filteredEvents = useMemo(() => {
    let events = rankedEvents;
    const now = new Date();

    // Filter by date range
    if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
      const startDate = new Date(filters.dateRange[0]);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(filters.dateRange[1]);
      endDate.setHours(23, 59, 59, 999);

      events = events.filter((event) => {
        const eventDate = new Date(event.startAt);
        return eventDate >= startDate && eventDate <= endDate;
      });
    }

    // Filter by time
    if (filters.timeFilter !== 'all') {
      events = filterEventsByTime(events, filters.timeFilter, now) as ScoredEvent[];
    }

    // Filter by selected tags
    if (filters.selectedTags.length > 0) {
      events = events.filter((event) =>
        event.tags.some((tag) => filters.selectedTags.includes(tag))
      );
    }

    // Filter by selected categories
    if (filters.selectedCategories.length > 0) {
      events = events.filter((event) =>
        filters.selectedCategories.includes(event.category)
      );
    }

    // Filter by city
    if (filters.city) {
      events = events.filter((event) => event.city === filters.city);
    }

    // Filter by distance (near me)
    if (filters.nearMeOnly && location) {
      events = filterByDistance(events, preferences.radiusMiles);
    }

    // Filter by search query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase().trim();
      events = events.filter((event) =>
        event.title.toLowerCase().includes(query) ||
        event.venueName?.toLowerCase().includes(query) ||
        event.neighborhood.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Filter by free only
    if (filters.freeOnly) {
      events = events.filter((event) =>
        event.price === 0 || event.priceLabel === 'Free'
      );
    }

    // Filter by price range (only if not free only)
    if (!filters.freeOnly && filters.priceRange) {
      const [minPrice, maxPrice] = filters.priceRange;
      events = events.filter((event) => {
        // If no price specified, include it
        if (event.price === undefined) return true;
        return event.price >= minPrice && event.price <= maxPrice;
      });
    }

    return events;
  }, [rankedEvents, filters, location, preferences.radiusMiles]);

  const groupedEvents = useMemo((): GroupedEvents => {
    const groups: GroupedEvents = {
      tonight: [],
      tomorrow: [],
      thisWeekend: [],
      nextWeek: [],
      worthPlanning: [],
    };

    for (const event of filteredEvents) {
      const section = getTimeSection(event.startAt);
      switch (section) {
        case 'Tonight':
        case 'Today':
          groups.tonight.push(event);
          break;
        case 'Tomorrow':
          groups.tomorrow.push(event);
          break;
        case 'This Weekend':
          groups.thisWeekend.push(event);
          break;
        case 'This Week':
          groups.nextWeek.push(event);
          break;
        default:
          groups.worthPlanning.push(event);
      }
    }

    // Sort each group chronologically by start time
    const sortByTime = (a: ScoredEvent, b: ScoredEvent) =>
      new Date(a.startAt).getTime() - new Date(b.startAt).getTime();

    groups.tonight.sort(sortByTime);
    groups.tomorrow.sort(sortByTime);
    groups.thisWeekend.sort(sortByTime);
    groups.nextWeek.sort(sortByTime);
    groups.worthPlanning.sort(sortByTime);

    return groups;
  }, [filteredEvents]);

  const savedFilteredEvents = useMemo(() => {
    return (savedIds: string[]) =>
      filteredEvents.filter((event) => savedIds.includes(event.id));
  }, [filteredEvents]);

  const getEventById = useMemo(() => {
    const eventMap = new Map(allEvents.map((e) => [e.id, e]));
    return (id: string) => eventMap.get(id);
  }, [allEvents]);

  return {
    allEvents,
    rankedEvents,
    filteredEvents,
    groupedEvents,
    savedFilteredEvents,
    getEventById,
    totalCount: allEvents.length,
    filteredCount: filteredEvents.length,
  };
}
