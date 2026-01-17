/**
 * Wellness & Fitness Events Scraper
 * Generates events for fitness classes, run clubs, and wellness activities
 */

import { addDays, format, getDay, nextSaturday, nextSunday } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface FitnessEvent {
  name: string;
  venue: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  url?: string;
  days: number[]; // 0-6, Sunday-Saturday
  time: string;
  category: 'Fitness' | 'Wellness';
  description: string;
  tags: string[];
  price: number;
}

export class WellnessFitnessScraper extends BaseScraper {
  private events: FitnessEvent[] = [
    // Run Clubs
    {
      name: 'November Project Miami',
      venue: 'Various Locations',
      address: 'Miami, FL',
      neighborhood: 'Miami',
      lat: 25.7617,
      lng: -80.1918,
      url: 'https://november-project.com/miami/',
      days: [3, 5], // Wednesday, Friday
      time: '06:30',
      category: 'Fitness',
      description: 'Free outdoor workout community. Show up, work out, get better.',
      tags: ['running', 'fitness-class', 'free-event'],
      price: 0,
    },
    {
      name: 'Lululemon Run Club Miami',
      venue: 'Lululemon Brickell City Centre',
      address: '701 S Miami Ave, Miami, FL 33131',
      neighborhood: 'Brickell',
      lat: 25.7672,
      lng: -80.1936,
      days: [6], // Saturday
      time: '08:00',
      category: 'Fitness',
      description: 'Free Saturday morning run club with the Lululemon community. All paces welcome.',
      tags: ['running', 'free-event'],
      price: 0,
    },
    {
      name: 'Wynwood Run Club',
      venue: 'Wynwood Walls',
      address: '2520 NW 2nd Ave, Miami, FL 33127',
      neighborhood: 'Wynwood',
      lat: 25.8011,
      lng: -80.1996,
      days: [2], // Tuesday
      time: '19:00',
      category: 'Fitness',
      description: 'Tuesday evening run through Wynwood arts district. 3-5 mile routes.',
      tags: ['running', 'free-event', 'local-favorite'],
      price: 0,
    },
    {
      name: 'Critical Mass Miami',
      venue: 'Government Center',
      address: '111 NW 1st St, Miami, FL 33128',
      neighborhood: 'Downtown Miami',
      lat: 25.7754,
      lng: -80.1938,
      url: 'https://www.instagram.com/criticalmassmiami/',
      days: [5], // Last Friday of month - simplified to every Friday for now
      time: '19:00',
      category: 'Fitness',
      description: 'Monthly bike ride through Miami streets. Meet at Government Center.',
      tags: ['cycling', 'free-event', 'community'],
      price: 0,
    },
    // Yoga
    {
      name: 'Bayfront Park Yoga',
      venue: 'Bayfront Park',
      address: '301 Biscayne Blvd, Miami, FL 33132',
      neighborhood: 'Downtown Miami',
      lat: 25.7753,
      lng: -80.1862,
      days: [6], // Saturday
      time: '09:00',
      category: 'Wellness',
      description: 'Free outdoor yoga in Bayfront Park with views of Biscayne Bay. All levels welcome.',
      tags: ['yoga', 'free-event', 'park'],
      price: 0,
    },
    {
      name: 'Soundscape Park Yoga',
      venue: 'Soundscape Park',
      address: '400 17th St, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7899,
      lng: -80.1348,
      days: [0], // Sunday
      time: '10:00',
      category: 'Wellness',
      description: 'Free yoga session at Soundscape Park by the New World Center.',
      tags: ['yoga', 'free-event', 'park'],
      price: 0,
    },
    {
      name: 'Beach Yoga at Surfside',
      venue: 'Surfside Beach',
      address: '9301 Collins Ave, Surfside, FL 33154',
      neighborhood: 'Surfside',
      lat: 25.8768,
      lng: -80.1245,
      days: [0], // Sunday
      time: '09:30',
      category: 'Wellness',
      description: 'Morning beach yoga at Surfside. Bring your own mat. All levels welcome.',
      tags: ['yoga', 'beach', 'free-event'],
      price: 0,
    },
    // Fitness Classes
    {
      name: 'F45 South Beach Pop-Up',
      venue: 'Lummus Park',
      address: 'Ocean Drive, Miami Beach, FL 33139',
      neighborhood: 'South Beach',
      lat: 25.7796,
      lng: -80.1303,
      days: [6], // Saturday
      time: '08:00',
      category: 'Fitness',
      description: 'Free outdoor F45 workout on the beach. High-intensity functional training.',
      tags: ['fitness-class', 'beach', 'free-event'],
      price: 0,
    },
    {
      name: 'Rowing Club at Miami Rowing Center',
      venue: 'Miami Rowing Center',
      address: '3601 Rickenbacker Cswy, Key Biscayne, FL 33149',
      neighborhood: 'Key Biscayne',
      lat: 25.7368,
      lng: -80.1656,
      days: [6, 0], // Saturday, Sunday
      time: '07:00',
      category: 'Fitness',
      description: 'Learn to row on beautiful Biscayne Bay. Beginners welcome.',
      tags: ['waterfront', 'fitness-class'],
      price: 25,
    },
    // Wellness
    {
      name: 'Meditation at Vizcaya',
      venue: 'Vizcaya Museum and Gardens',
      address: '3251 S Miami Ave, Miami, FL 33129',
      neighborhood: 'Coconut Grove',
      lat: 25.7445,
      lng: -80.2106,
      days: [0], // Sunday
      time: '08:00',
      category: 'Wellness',
      description: 'Guided meditation in the gardens of Vizcaya. Find peace in historic surroundings.',
      tags: ['meditation', 'park'],
      price: 20,
    },
    {
      name: 'Breathwork at The Standard',
      venue: 'The Standard Spa Miami Beach',
      address: '40 Island Ave, Miami Beach, FL 33139',
      neighborhood: 'Miami Beach',
      lat: 25.7917,
      lng: -80.1574,
      days: [0], // Sunday
      time: '10:00',
      category: 'Wellness',
      description: 'Guided breathwork session at The Standard spa. Connect mind and body.',
      tags: ['meditation', 'waterfront'],
      price: 35,
    },
  ];

  constructor() {
    super('Wellness & Fitness', { weight: 1.2, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const weeksAhead = 6;

    this.log(`Generating wellness & fitness events for next ${weeksAhead} weeks...`);

    for (const eventTemplate of this.events) {
      const generated = this.generateRecurringEvents(eventTemplate, weeksAhead);
      events.push(...generated);
    }

    this.log(`Generated ${events.length} wellness & fitness events`);
    return events;
  }

  private generateRecurringEvents(template: FitnessEvent, weeksAhead: number): RawEvent[] {
    const events: RawEvent[] = [];
    const today = new Date();
    const daysToCheck = weeksAhead * 7;

    for (let i = 0; i < daysToCheck; i++) {
      const checkDate = addDays(today, i);
      const dayOfWeek = getDay(checkDate);

      if (template.days.includes(dayOfWeek)) {
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        const startAt = `${dateStr}T${template.time}:00`;

        events.push({
          title: template.name,
          startAt,
          venueName: template.venue,
          address: template.address,
          neighborhood: template.neighborhood,
          lat: template.lat,
          lng: template.lng,
          city: 'Miami',
          tags: template.tags,
          category: template.category,
          priceLabel: template.price === 0 ? 'Free' : '$',
          priceAmount: template.price,
          isOutdoor: template.tags.includes('beach') || template.tags.includes('park'),
          description: template.description,
          sourceUrl: template.url,
          sourceName: this.name,
          recurring: true,
          recurrencePattern: 'weekly',
        });
      }
    }

    return events;
  }
}
