import { parseISO, format } from 'date-fns';
import type { Event } from '../types';

function formatICSDate(isoString: string): string {
  const date = parseISO(isoString);
  return format(date, "yyyyMMdd'T'HHmmss");
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function foldLine(line: string): string {
  const maxLength = 75;
  if (line.length <= maxLength) {
    return line;
  }

  const lines: string[] = [];
  let remaining = line;

  while (remaining.length > maxLength) {
    lines.push(remaining.slice(0, maxLength));
    remaining = ' ' + remaining.slice(maxLength);
  }
  lines.push(remaining);

  return lines.join('\r\n');
}

export function generateICS(event: Event): string {
  const now = new Date();
  const uid = `${event.id}@irl-app`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//IRL App//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(now.toISOString())}`,
    `DTSTART;TZID=${event.timezone}:${formatICSDate(event.startAt)}`,
  ];

  if (event.endAt) {
    lines.push(`DTEND;TZID=${event.timezone}:${formatICSDate(event.endAt)}`);
  }

  lines.push(`SUMMARY:${escapeICSText(event.title)}`);

  const location = [event.venueName, event.address]
    .filter(Boolean)
    .join(', ');
  if (location) {
    lines.push(`LOCATION:${escapeICSText(location)}`);
  }

  const description = [
    event.shortWhy,
    '',
    event.description,
    '',
    event.source?.url ? `More info: ${event.source.url}` : '',
  ]
    .filter((line) => line !== undefined)
    .join('\\n');

  lines.push(`DESCRIPTION:${escapeICSText(description)}`);

  if (event.source?.url) {
    lines.push(`URL:${event.source.url}`);
  }

  if (event.lat !== null && event.lng !== null) {
    lines.push(`GEO:${event.lat};${event.lng}`);
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.map(foldLine).join('\r\n');
}

export function downloadICS(event: Event): void {
  const icsContent = generateICS(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function getGoogleCalendarUrl(event: Event): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatICSDate(event.startAt)}/${formatICSDate(event.endAt || event.startAt)}`,
    details: `${event.shortWhy}\n\n${event.description}`,
    location: [event.venueName, event.address].filter(Boolean).join(', '),
  });

  return `https://calendar.google.com/calendar/render?${params}`;
}

export function openGoogleCalendar(event: Event): void {
  window.open(getGoogleCalendarUrl(event), '_blank');
}
