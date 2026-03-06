import { useState, useEffect, useMemo } from 'react';
import { rankEvents, filterByDistance } from '../services/ranking';
import { filterEventsByTime, getTimeSection, isEventPast } from '../utils/time';
import { getWeatherForTime } from '../services/weather';
import { WEATHER_CODES } from '../constants';
import type {
  Event,
  ScoredEvent,
  FilterState,
  RankingContext,
  UserPreferences,
  UserLocation,
  WeatherForecast,
} from '../types';

const DATA_FILES = [
  `${import.meta.env.BASE_URL}data/events.miami.json`,
  `${import.meta.env.BASE_URL}data/events.fll.json`,
  `${import.meta.env.BASE_URL}data/events.pb.json`,
];

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        const results = await Promise.all(
          DATA_FILES.map((url) => fetch(url).then((r) => r.json()))
        );
        if (cancelled) return;
        const combined = results.flat() as Event[];
        const upcoming = combined.filter((e) => !isEventPast(e.startAt));
        setAllEvents(upcoming);
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadEvents();
    return () => { cancelled = true; };
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

    // Filter by selected neighborhoods
    if (filters.selectedNeighborhoods && filters.selectedNeighborhoods.length > 0) {
      events = events.filter((event) =>
        filters.selectedNeighborhoods.includes(event.neighborhood)
      );
    }

    // Filter by outdoor only
    if (filters.outdoorOnly) {
      events = events.filter((event) => event.isOutdoor);
    }

    // Filter by sunny only (outdoor events during daylight with clear weather)
    if (filters.sunnyOnly && weather) {
      events = events.filter((event) => {
        // Never include nightlife category in sunny filter
        if (event.category === 'Nightlife') return false;

        // Must be outdoor or fitness/wellness category
        const outdoorCategories = ['Outdoors', 'Fitness', 'Wellness'];
        const isOutdoorEvent = event.indoorOutdoor === 'outdoor' ||
                               event.indoorOutdoor === 'both' ||
                               event.isOutdoor ||
                               outdoorCategories.includes(event.category);
        if (!isOutdoorEvent) return false;

        // Strict daytime enforcement: 7am-7pm only (hour >= 7 && hour < 19)
        const eventDate = new Date(event.startAt);
        const eventHour = eventDate.getHours();
        const isDaytimeEvent = eventHour >= 7 && eventHour < 19;

        if (!isDaytimeEvent) {
          return false;
        }

        // Check weather at event time - must be clear or partly cloudy
        const eventWeather = getWeatherForTime(weather, event.startAt);
        if (!eventWeather) return true; // Include if no weather data available
        const code = eventWeather.weatherCode;
        const isClearWeather = (WEATHER_CODES.CLEAR as readonly number[]).includes(code) ||
                               (WEATHER_CODES.PARTLY_CLOUDY as readonly number[]).includes(code);

        return isClearWeather;
      });
    }

    return events;
  }, [rankedEvents, filters, location, preferences.radiusMiles, weather]);

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
    isLoading,
  };
}
