import {
  format,
  isToday,
  isTomorrow,
  isThisWeek,
  differenceInHours,
  differenceInMinutes,
  parseISO,
  addDays,
  startOfDay,
  endOfMonth,
  endOfDay,
} from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import type { TimeFilter } from '../types';

const DEFAULT_TIMEZONE = 'America/New_York';

export function parseEventTime(isoString: string, timezone?: string): Date {
  const date = parseISO(isoString);
  return toZonedTime(date, timezone || DEFAULT_TIMEZONE);
}

export function formatEventTime(
  isoString: string,
  timezone?: string
): string {
  const tz = timezone || DEFAULT_TIMEZONE;
  return formatInTimeZone(parseISO(isoString), tz, 'h:mm a');
}

export function formatEventDate(
  isoString: string,
  timezone?: string
): string {
  const tz = timezone || DEFAULT_TIMEZONE;
  const date = parseEventTime(isoString, tz);

  if (isToday(date)) {
    return 'Today';
  }
  if (isTomorrow(date)) {
    return 'Tomorrow';
  }
  return formatInTimeZone(parseISO(isoString), tz, 'EEE, MMM d');
}

export function formatEventDateLong(
  isoString: string,
  timezone?: string
): string {
  const tz = timezone || DEFAULT_TIMEZONE;
  return formatInTimeZone(parseISO(isoString), tz, 'EEEE, MMMM d');
}

export function formatEventTimeRange(
  startAt: string,
  endAt?: string,
  timezone?: string
): string {
  const startTime = formatEventTime(startAt, timezone);
  if (!endAt) {
    return startTime;
  }
  const endTime = formatEventTime(endAt, timezone);
  return `${startTime} - ${endTime}`;
}

export function getRelativeTimeLabel(isoString: string): string {
  const date = parseISO(isoString);
  const now = new Date();
  const hoursUntil = differenceInHours(date, now);
  const minutesUntil = differenceInMinutes(date, now);

  if (minutesUntil < 0) {
    return 'Started';
  }
  if (minutesUntil < 60) {
    return `In ${minutesUntil} min`;
  }
  if (hoursUntil < 24) {
    return `In ${hoursUntil} hr`;
  }
  if (isToday(date)) {
    return 'Today';
  }
  if (isTomorrow(date)) {
    return 'Tomorrow';
  }
  return format(date, 'EEE, MMM d');
}

export function getTimeSection(isoString: string): string {
  const date = parseISO(isoString);
  const now = new Date();

  if (isToday(date)) {
    const hour = date.getHours();
    if (hour >= 17) {
      return 'Tonight';
    }
    return 'Today';
  }

  if (isTomorrow(date)) {
    return 'Tomorrow';
  }

  const thisWeekend = getThisWeekend(now);
  if (date >= thisWeekend.start && date <= thisWeekend.end) {
    return 'This Weekend';
  }

  if (isThisWeek(date, { weekStartsOn: 1 })) {
    return 'This Week';
  }

  return 'Worth Planning';
}

export function getThisWeekend(now: Date): { start: Date; end: Date } {
  const dayOfWeek = now.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
  const saturday = startOfDay(addDays(now, daysUntilSaturday));
  const sunday = endOfDay(addDays(saturday, 1));
  return { start: saturday, end: sunday };
}

export function filterEventsByTime(
  events: { startAt: string }[],
  filter: TimeFilter,
  now: Date
): typeof events {
  if (filter === 'all') {
    return events;
  }

  return events.filter((event) => {
    const eventDate = parseISO(event.startAt);

    switch (filter) {
      case 'today':
        return isToday(eventDate);
      case 'tomorrow':
        return isTomorrow(eventDate);
      case 'this-week': {
        // Rolling 7 days from now (not calendar week)
        const in7Days = endOfDay(addDays(now, 7));
        return eventDate >= startOfDay(now) && eventDate <= in7Days;
      }
      case 'this-month': {
        const monthEnd = endOfMonth(now);
        return eventDate >= startOfDay(now) && eventDate <= monthEnd;
      }
      case 'weekend': {
        const weekend = getThisWeekend(now);
        return eventDate >= weekend.start && eventDate <= weekend.end;
      }
      default:
        return true;
    }
  });
}

export function isEventPast(isoString: string): boolean {
  return parseISO(isoString) < new Date();
}

export function isEventHappeningNow(startAt: string, endAt?: string): boolean {
  const now = new Date();
  const start = parseISO(startAt);

  if (now < start) {
    return false;
  }

  if (endAt) {
    const end = parseISO(endAt);
    return now <= end;
  }

  // If no end time, assume event lasts 3 hours
  const assumedEnd = addDays(start, 0);
  assumedEnd.setHours(start.getHours() + 3);
  return now <= assumedEnd;
}

// Alias for shorter import
export const isHappeningNow = isEventHappeningNow;
