/**
 * Community Fitness Events
 * Verified recurring fitness, wellness, and community events
 * Sources: coffeeandchill.com, themiamibikescene.com, miamiandbeaches.com, run club websites
 */

import { addDays, addWeeks, format, getDay, nextDay } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

// Day of week mapping (0 = Sunday, 1 = Monday, etc.)
const DAYS = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
} as const;

interface RecurringEvent {
  name: string;
  venue: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  dayOfWeek: keyof typeof DAYS;
  time: string;
  category: string;
  description: string;
  tags: string[];
  price: number;
  sourceUrl: string;
  city?: 'Miami' | 'Fort Lauderdale';
  // For bi-weekly or monthly events
  frequency?: 'weekly' | 'biweekly' | 'monthly' | 'last-friday' | 'second-tuesday' | 'third-saturday';
}

// ==========================================
// COFFEE & CHILL MIAMI
// Every other Sunday morning, various locations
// Source: coffeeandchill.com, @coffeeandchillmiami
// ==========================================
const COFFEE_AND_CHILL_EVENTS: RecurringEvent[] = [
  {
    name: 'Coffee & Chill Miami',
    venue: 'Strawberry Moon at The Goodtime Hotel',
    address: '601 Washington Ave, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    lat: 25.7702,
    lng: -80.1340,
    dayOfWeek: 'sunday',
    time: '10:00',
    category: 'Wellness',
    description: 'Wellness morning featuring cold plunges, coffee & matcha by Raccoon Coffee, protein shakes, B-12 shots, massage, and community. Every other Sunday.',
    tags: ['wellness', 'community', 'outdoor', 'local-favorite', 'free-event'],
    price: 0,
    sourceUrl: 'https://coffeeandchill.com/collections/miami',
    frequency: 'biweekly',
  },
];

// ==========================================
// FREE YOGA IN MIAMI PARKS
// Source: miamiandbeaches.com/things-to-do/spa-wellness/free-yoga-in-miami
// ==========================================
const FREE_YOGA_EVENTS: RecurringEvent[] = [
  // South Beach - 3rd Street Beach Yoga (daily sunrise)
  {
    name: 'Sunrise Beach Yoga',
    venue: '3rd Street Beach',
    address: '3rd St & Ocean Dr, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    lat: 25.7680,
    lng: -80.1300,
    dayOfWeek: 'saturday',
    time: '07:00',
    category: 'Wellness',
    description: 'Free sunrise yoga on the beach near the 3rd Street lifeguard tower. Donations welcome. Bring your own mat.',
    tags: ['wellness', 'free-event', 'outdoor', 'beach', 'local-favorite'],
    price: 0,
    sourceUrl: 'https://www.miamiandbeaches.com/things-to-do/spa-wellness/free-yoga-in-miami',
  },
  {
    name: 'Sunrise Beach Yoga',
    venue: '3rd Street Beach',
    address: '3rd St & Ocean Dr, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    lat: 25.7680,
    lng: -80.1300,
    dayOfWeek: 'sunday',
    time: '07:00',
    category: 'Wellness',
    description: 'Free sunrise yoga on the beach near the 3rd Street lifeguard tower. Donations welcome. Bring your own mat.',
    tags: ['wellness', 'free-event', 'outdoor', 'beach', 'local-favorite'],
    price: 0,
    sourceUrl: 'https://www.miamiandbeaches.com/things-to-do/spa-wellness/free-yoga-in-miami',
  },
  // Collins Park at The Bass - Mon & Wed 6pm
  {
    name: 'Yoga at Collins Park',
    venue: 'Collins Park at The Bass',
    address: '2100 Collins Ave, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    lat: 25.7942,
    lng: -80.1278,
    dayOfWeek: 'monday',
    time: '18:00',
    category: 'Wellness',
    description: 'Free outdoor yoga in Collins Park presented by City of Miami Beach Parks and Recreation.',
    tags: ['wellness', 'free-event', 'outdoor', 'park'],
    price: 0,
    sourceUrl: 'https://www.miamiandbeaches.com/things-to-do/spa-wellness/free-yoga-in-miami',
  },
  {
    name: 'Yoga at Collins Park',
    venue: 'Collins Park at The Bass',
    address: '2100 Collins Ave, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    lat: 25.7942,
    lng: -80.1278,
    dayOfWeek: 'wednesday',
    time: '18:00',
    category: 'Wellness',
    description: 'Free outdoor yoga in Collins Park presented by City of Miami Beach Parks and Recreation.',
    tags: ['wellness', 'free-event', 'outdoor', 'park'],
    price: 0,
    sourceUrl: 'https://www.miamiandbeaches.com/things-to-do/spa-wellness/free-yoga-in-miami',
  },
  // North Beach Bandshell - Tue & Thu 6pm
  {
    name: 'Yoga at North Beach Bandshell',
    venue: 'North Beach Bandshell',
    address: '7275 Collins Ave, Miami Beach, FL 33141',
    neighborhood: 'North Beach',
    lat: 25.8683,
    lng: -80.1214,
    dayOfWeek: 'tuesday',
    time: '18:00',
    category: 'Wellness',
    description: 'Free outdoor yoga at the North Beach Bandshell. Presented by City of Miami Beach Parks and Recreation.',
    tags: ['wellness', 'free-event', 'outdoor'],
    price: 0,
    sourceUrl: 'https://www.miamiandbeaches.com/things-to-do/spa-wellness/free-yoga-in-miami',
  },
  {
    name: 'Yoga at North Beach Bandshell',
    venue: 'North Beach Bandshell',
    address: '7275 Collins Ave, Miami Beach, FL 33141',
    neighborhood: 'North Beach',
    lat: 25.8683,
    lng: -80.1214,
    dayOfWeek: 'thursday',
    time: '18:00',
    category: 'Wellness',
    description: 'Free outdoor yoga at the North Beach Bandshell. Presented by City of Miami Beach Parks and Recreation.',
    tags: ['wellness', 'free-event', 'outdoor'],
    price: 0,
    sourceUrl: 'https://www.miamiandbeaches.com/things-to-do/spa-wellness/free-yoga-in-miami',
  },
  // Lummus Park - Sunday 10am
  {
    name: 'Yoga at Lummus Park',
    venue: 'Lummus Park',
    address: 'Ocean Dr & 10th St, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    lat: 25.7780,
    lng: -80.1300,
    dayOfWeek: 'sunday',
    time: '10:00',
    category: 'Wellness',
    description: 'Free Sunday morning yoga in Lummus Park. Presented by City of Miami Beach Parks and Recreation.',
    tags: ['wellness', 'free-event', 'outdoor', 'park', 'beach'],
    price: 0,
    sourceUrl: 'https://www.miamiandbeaches.com/things-to-do/spa-wellness/free-yoga-in-miami',
  },
  // Peacock Park (Coconut Grove) - Wed 6:30pm
  {
    name: 'Yoga at Peacock Park',
    venue: 'Peacock Park',
    address: '2820 McFarlane Rd, Miami, FL 33133',
    neighborhood: 'Coconut Grove',
    lat: 25.7267,
    lng: -80.2420,
    dayOfWeek: 'wednesday',
    time: '18:30',
    category: 'Wellness',
    description: 'Free outdoor yoga in Coconut Grove\'s Peacock Park. Open Door Yoga with instructor Natalie Morales. All ages and fitness levels welcome.',
    tags: ['wellness', 'free-event', 'outdoor', 'park', 'local-favorite'],
    price: 0,
    sourceUrl: 'https://www.miamiandbeaches.com/things-to-do/spa-wellness/free-yoga-in-miami',
  },
  // The Underline - Saturday 9am
  {
    name: 'Yoga at The Underline',
    venue: 'The Underline - Brickell Backyard',
    address: '1075 SW 8th St, Miami, FL 33130',
    neighborhood: 'Brickell',
    lat: 25.7650,
    lng: -80.2050,
    dayOfWeek: 'saturday',
    time: '09:00',
    category: 'Wellness',
    description: 'Free Saturday yoga at The Underline\'s Brickell Backyard Sound Stage Plaza. Presented by Friends of The Underline and Baptist Health.',
    tags: ['wellness', 'free-event', 'outdoor', 'park'],
    price: 0,
    sourceUrl: 'https://www.theunderline.org/',
  },
  // SoundScape Park - 3rd Saturday (seasonal)
  {
    name: 'Yoga at SoundScape Park',
    venue: 'SoundScape Park at New World Center',
    address: '500 17th St, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    lat: 25.7899,
    lng: -80.1348,
    dayOfWeek: 'saturday',
    time: '09:00',
    category: 'Wellness',
    description: 'Free yoga at SoundScape Park on the third Saturday of the month (October-April). Presented by Jackson Health System. Bring your own mat.',
    tags: ['wellness', 'free-event', 'outdoor', 'park'],
    price: 0,
    sourceUrl: 'https://www.miamiandbeaches.com/things-to-do/spa-wellness/free-yoga-in-miami',
    frequency: 'third-saturday',
  },
];

// ==========================================
// RUN CLUBS
// Source: Various official run club pages
// ==========================================
const RUN_CLUB_EVENTS: RecurringEvent[] = [
  // Nike/Baptist Health Run Club - Every Thursday
  {
    name: 'Nike Run Club on Lincoln Road',
    venue: 'Nike Store Lincoln Road',
    address: '1035 Lincoln Rd, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    lat: 25.7906,
    lng: -80.1400,
    dayOfWeek: 'thursday',
    time: '19:01',
    category: 'Fitness',
    description: 'Baptist Health South Beach Run Club powered by Nike. 150+ runners every week on scenic routes. Free and meets rain or shine. All paces welcome.',
    tags: ['fitness', 'free-event', 'community', 'local-favorite'],
    price: 0,
    sourceUrl: 'https://www.nike.com/miami',
  },
  // On Running - Wednesday
  {
    name: 'On Running Club Miami',
    venue: 'On Store Miami Design District',
    address: '125 NE 40th St, Miami, FL 33137',
    neighborhood: 'Design District',
    lat: 25.8135,
    lng: -80.1918,
    dayOfWeek: 'wednesday',
    time: '18:30',
    category: 'Fitness',
    description: 'Weekly run club at On Running\'s Design District store. All levels welcome, from beginners to competitive runners.',
    tags: ['fitness', 'free-event', 'community'],
    price: 0,
    sourceUrl: 'https://miami.weekly.run.events.on-running.com/',
  },
  // Lululemon - varies by store, usually monthly
  {
    name: 'Lululemon Run Club',
    venue: 'Lululemon Brickell',
    address: '1428 Brickell Ave, Miami, FL 33131',
    neighborhood: 'Brickell',
    lat: 25.7580,
    lng: -80.1918,
    dayOfWeek: 'saturday',
    time: '08:00',
    category: 'Fitness',
    description: 'Monthly community run hosted by Lululemon Brickell. Check store calendar for dates. All paces welcome.',
    tags: ['fitness', 'free-event', 'community'],
    price: 0,
    sourceUrl: 'https://shop.lululemon.com/stores/us/miami/brickell-city-centre',
    frequency: 'monthly',
  },
];

// ==========================================
// CYCLING GROUP RIDES
// Source: themiamibikescene.com/p/group-rides.html
// ==========================================
const CYCLING_EVENTS: RecurringEvent[] = [
  // Critical Mass - Last Friday (already in cultural-attractions.ts but keeping here for reference)
  // Commented out to avoid duplicates
  /*
  {
    name: 'Miami Critical Mass',
    venue: 'Government Center',
    address: '111 NW 1st St, Miami, FL 33128',
    neighborhood: 'Downtown',
    lat: 25.7750,
    lng: -80.1940,
    dayOfWeek: 'friday',
    time: '19:15',
    category: 'Fitness',
    description: 'Monthly community bike ride through Miami streets. Meet at Government Center, ride through the city with hundreds of cyclists. Last Friday of every month.',
    tags: ['fitness', 'free-event', 'outdoor', 'community', 'local-favorite'],
    price: 0,
    sourceUrl: 'https://criticalmassmiami.com/',
    frequency: 'last-friday',
  },
  */
  // Saturday beginner ride - 2nd Saturday
  {
    name: 'Beginner Bike Ride - Everglades BC',
    venue: 'Ponce de Leon Middle School',
    address: '5801 Augusto St, Coral Gables, FL 33146',
    neighborhood: 'Coral Gables',
    lat: 25.7120,
    lng: -80.2780,
    dayOfWeek: 'saturday',
    time: '07:30',
    category: 'Fitness',
    description: 'Beginner-friendly group ride hosted by Everglades Bicycle Club on the 2nd Saturday of each month. 10 miles at a relaxed pace. Perfect for new cyclists.',
    tags: ['fitness', 'free-event', 'outdoor', 'community'],
    price: 0,
    sourceUrl: 'https://www.evergladesbc.com/',
    frequency: 'monthly',
  },
  // Taco Tuesday Ride - 2nd Tuesday monthly
  {
    name: 'Taco Tuesday Bike Ride',
    venue: 'Bayfront Park',
    address: '301 N Biscayne Blvd, Miami, FL 33132',
    neighborhood: 'Downtown',
    lat: 25.7753,
    lng: -80.1863,
    dayOfWeek: 'tuesday',
    time: '20:00',
    category: 'Fitness',
    description: 'Social bike ride on the 2nd Tuesday of every month. 15-20 miles through the city at a casual pace. Meet at Bayfront Park.',
    tags: ['fitness', 'free-event', 'outdoor', 'community', 'local-favorite'],
    price: 0,
    sourceUrl: 'https://www.themiamibikescene.com/p/group-rides.html',
    frequency: 'second-tuesday',
  },
  // Saturday morning at Sun Cycling - weekly
  {
    name: 'Meeting Point Ride',
    venue: 'Sun Cycling',
    address: '3001 SW 27th Ave, Miami, FL 33133',
    neighborhood: 'Coconut Grove',
    lat: 25.7440,
    lng: -80.2389,
    dayOfWeek: 'saturday',
    time: '07:15',
    category: 'Fitness',
    description: 'Weekly Saturday group ride from Sun Cycling in Coconut Grove. Routes to Homestead or Key Biscayne, 50-60 miles. Intermediate to advanced pace.',
    tags: ['fitness', 'free-event', 'outdoor', 'community'],
    price: 0,
    sourceUrl: 'https://www.themiamibikescene.com/p/group-rides.html',
  },
  // Everglades BC Saturday - weekly
  {
    name: 'Everglades Bicycle Club Saturday Ride',
    venue: 'Ponce de Leon Middle School',
    address: '5801 Augusto St, Coral Gables, FL 33146',
    neighborhood: 'Coral Gables',
    lat: 25.7120,
    lng: -80.2780,
    dayOfWeek: 'saturday',
    time: '07:15',
    category: 'Fitness',
    description: 'Weekly Saturday group ride with Everglades Bicycle Club. Multiple pace groups: 20-60 miles. Celebrating 50 years as Florida\'s best bicycle club.',
    tags: ['fitness', 'free-event', 'outdoor', 'community', 'local-favorite'],
    price: 0,
    sourceUrl: 'https://www.evergladesbc.com/',
  },
  // Donut Ride - Saturday
  {
    name: 'Bike Tech Donut Ride',
    venue: 'Bike Tech',
    address: '1622 NE 2nd Ave, Miami, FL 33132',
    neighborhood: 'Downtown',
    lat: 25.7880,
    lng: -80.1918,
    dayOfWeek: 'saturday',
    time: '06:45',
    category: 'Fitness',
    description: 'Saturday morning group ride from Bike Tech. 18-20 miles at intermediate pace. Ends with donuts!',
    tags: ['fitness', 'free-event', 'outdoor', 'community'],
    price: 0,
    sourceUrl: 'https://www.themiamibikescene.com/p/group-rides.html',
  },
  // Breaking The Cycle - Friday evening (Level C/D beginner friendly)
  {
    name: 'Breaking The Cycle Friday Ride',
    venue: 'Breaking The Cycle',
    address: '10400 NW 7th Ave, Miami, FL 33150',
    neighborhood: 'Little Haiti',
    lat: 25.8490,
    lng: -80.2106,
    dayOfWeek: 'friday',
    time: '18:30',
    category: 'Fitness',
    description: 'Beginner-friendly Friday evening ride. 15 miles at a relaxed pace. Great for new cyclists looking to join the community.',
    tags: ['fitness', 'free-event', 'outdoor', 'community'],
    price: 0,
    sourceUrl: 'https://www.themiamibikescene.com/p/group-rides.html',
  },
];

// ==========================================
// SCRAPER CLASSES
// ==========================================

/**
 * Coffee & Chill Miami Scraper
 * Bi-weekly Sunday wellness events
 */
export class CoffeeAndChillRealScraper extends BaseScraper {
  constructor() {
    super('Coffee & Chill', { weight: 1.2, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Generating Coffee & Chill events...');
    const events: RawEvent[] = [];
    const weeksAhead = 12;

    for (const event of COFFEE_AND_CHILL_EVENTS) {
      // Coffee & Chill is every other Sunday
      // Find upcoming Sundays and generate bi-weekly
      const dates = this.getBiweeklySundays(weeksAhead);
      for (const date of dates) {
        events.push(this.createEvent(event, date));
      }
    }

    this.log(`Generated ${events.length} Coffee & Chill events`);
    return events;
  }

  private getBiweeklySundays(weeks: number): string[] {
    const dates: string[] = [];
    const today = new Date();

    // Find next Sunday
    let nextSunday = today;
    while (getDay(nextSunday) !== 0) {
      nextSunday = addDays(nextSunday, 1);
    }

    // Generate bi-weekly Sundays
    for (let i = 0; i < weeks / 2; i++) {
      const date = addWeeks(nextSunday, i * 2);
      dates.push(format(date, 'yyyy-MM-dd'));
    }

    return dates;
  }

  private createEvent(event: RecurringEvent, date: string): RawEvent {
    return {
      title: event.name,
      startAt: `${date}T${event.time}:00`,
      venueName: event.venue,
      address: event.address,
      neighborhood: event.neighborhood,
      city: event.city || 'Miami',
      lat: event.lat,
      lng: event.lng,
      description: event.description,
      category: event.category,
      tags: event.tags,
      priceAmount: event.price,
      isOutdoor: event.tags.includes('outdoor') || event.tags.includes('beach'),
      sourceName: this.name,
      sourceUrl: event.sourceUrl,
    };
  }
}

/**
 * Free Yoga in Miami Parks Scraper
 * Weekly free yoga classes at various parks
 */
export class FreeYogaScraper extends BaseScraper {
  constructor() {
    super('Free Yoga Miami', { weight: 1.1, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Generating free yoga events...');
    const events: RawEvent[] = [];
    const weeksAhead = 8;

    for (const event of FREE_YOGA_EVENTS) {
      const dates = this.getDatesForEvent(event, weeksAhead);
      for (const date of dates) {
        events.push(this.createEvent(event, date));
      }
    }

    this.log(`Generated ${events.length} free yoga events`);
    return events;
  }

  private getDatesForEvent(event: RecurringEvent, weeks: number): string[] {
    const dates: string[] = [];
    const today = new Date();
    const dayNum = DAYS[event.dayOfWeek];

    if (event.frequency === 'third-saturday') {
      // Third Saturday of each month
      for (let m = 0; m < 4; m++) {
        const monthDate = addDays(today, m * 30);
        const thirdSat = this.getThirdSaturday(monthDate.getFullYear(), monthDate.getMonth());
        if (thirdSat >= today) {
          dates.push(format(thirdSat, 'yyyy-MM-dd'));
        }
      }
    } else {
      // Weekly events
      let next = today;
      while (getDay(next) !== dayNum) {
        next = addDays(next, 1);
      }

      for (let w = 0; w < weeks; w++) {
        const date = addWeeks(next, w);
        dates.push(format(date, 'yyyy-MM-dd'));
      }
    }

    return dates;
  }

  private getThirdSaturday(year: number, month: number): Date {
    let date = new Date(year, month, 1);
    let satCount = 0;
    while (satCount < 3) {
      if (getDay(date) === 6) satCount++;
      if (satCount < 3) date = addDays(date, 1);
    }
    return date;
  }

  private createEvent(event: RecurringEvent, date: string): RawEvent {
    return {
      title: event.name,
      startAt: `${date}T${event.time}:00`,
      venueName: event.venue,
      address: event.address,
      neighborhood: event.neighborhood,
      city: event.city || 'Miami',
      lat: event.lat,
      lng: event.lng,
      description: event.description,
      category: event.category,
      tags: event.tags,
      priceAmount: event.price,
      isOutdoor: true,
      sourceName: this.name,
      sourceUrl: event.sourceUrl,
    };
  }
}

/**
 * Run Clubs Scraper
 * Weekly run club meetups
 */
export class RunClubsScraper extends BaseScraper {
  constructor() {
    super('Run Clubs', { weight: 1.1, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Generating run club events...');
    const events: RawEvent[] = [];
    const weeksAhead = 8;

    for (const event of RUN_CLUB_EVENTS) {
      const dates = this.getDatesForEvent(event, weeksAhead);
      for (const date of dates) {
        events.push(this.createEvent(event, date));
      }
    }

    this.log(`Generated ${events.length} run club events`);
    return events;
  }

  private getDatesForEvent(event: RecurringEvent, weeks: number): string[] {
    const dates: string[] = [];
    const today = new Date();
    const dayNum = DAYS[event.dayOfWeek];

    if (event.frequency === 'monthly') {
      // First occurrence of that day each month
      for (let m = 0; m < 3; m++) {
        const monthDate = addDays(today, m * 30);
        const firstDay = this.getFirstDayOfMonth(monthDate.getFullYear(), monthDate.getMonth(), dayNum);
        if (firstDay >= today) {
          dates.push(format(firstDay, 'yyyy-MM-dd'));
        }
      }
    } else {
      // Weekly events
      let next = today;
      while (getDay(next) !== dayNum) {
        next = addDays(next, 1);
      }

      for (let w = 0; w < weeks; w++) {
        const date = addWeeks(next, w);
        dates.push(format(date, 'yyyy-MM-dd'));
      }
    }

    return dates;
  }

  private getFirstDayOfMonth(year: number, month: number, dayOfWeek: number): Date {
    let date = new Date(year, month, 1);
    while (getDay(date) !== dayOfWeek) {
      date = addDays(date, 1);
    }
    return date;
  }

  private createEvent(event: RecurringEvent, date: string): RawEvent {
    return {
      title: event.name,
      startAt: `${date}T${event.time}:00`,
      venueName: event.venue,
      address: event.address,
      neighborhood: event.neighborhood,
      city: event.city || 'Miami',
      lat: event.lat,
      lng: event.lng,
      description: event.description,
      category: event.category,
      tags: event.tags,
      priceAmount: event.price,
      isOutdoor: true,
      sourceName: this.name,
      sourceUrl: event.sourceUrl,
    };
  }
}

/**
 * Cycling Group Rides Scraper
 * Weekly and monthly group bike rides
 */
export class CyclingGroupRidesScraper extends BaseScraper {
  constructor() {
    super('Cycling Group Rides', { weight: 1.1, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    this.log('Generating cycling group ride events...');
    const events: RawEvent[] = [];
    const weeksAhead = 8;

    for (const event of CYCLING_EVENTS) {
      const dates = this.getDatesForEvent(event, weeksAhead);
      for (const date of dates) {
        events.push(this.createEvent(event, date));
      }
    }

    this.log(`Generated ${events.length} cycling events`);
    return events;
  }

  private getDatesForEvent(event: RecurringEvent, weeks: number): string[] {
    const dates: string[] = [];
    const today = new Date();
    const dayNum = DAYS[event.dayOfWeek];

    if (event.frequency === 'last-friday') {
      // Last Friday of each month
      for (let m = 0; m < 3; m++) {
        const monthDate = addDays(today, m * 30);
        const lastFri = this.getLastFriday(monthDate.getFullYear(), monthDate.getMonth());
        if (lastFri >= today) {
          dates.push(format(lastFri, 'yyyy-MM-dd'));
        }
      }
    } else if (event.frequency === 'second-tuesday') {
      // Second Tuesday of each month
      for (let m = 0; m < 3; m++) {
        const monthDate = addDays(today, m * 30);
        const secondTue = this.getSecondTuesday(monthDate.getFullYear(), monthDate.getMonth());
        if (secondTue >= today) {
          dates.push(format(secondTue, 'yyyy-MM-dd'));
        }
      }
    } else if (event.frequency === 'monthly') {
      // First Saturday (for beginner ride)
      for (let m = 0; m < 3; m++) {
        const monthDate = addDays(today, m * 30);
        const secondSat = this.getSecondSaturday(monthDate.getFullYear(), monthDate.getMonth());
        if (secondSat >= today) {
          dates.push(format(secondSat, 'yyyy-MM-dd'));
        }
      }
    } else {
      // Weekly events
      let next = today;
      while (getDay(next) !== dayNum) {
        next = addDays(next, 1);
      }

      for (let w = 0; w < weeks; w++) {
        const date = addWeeks(next, w);
        dates.push(format(date, 'yyyy-MM-dd'));
      }
    }

    return dates;
  }

  private getLastFriday(year: number, month: number): Date {
    // Start from last day of month and work backwards
    let date = new Date(year, month + 1, 0); // Last day of month
    while (getDay(date) !== 5) {
      date = addDays(date, -1);
    }
    return date;
  }

  private getSecondTuesday(year: number, month: number): Date {
    let date = new Date(year, month, 1);
    let tueCount = 0;
    while (tueCount < 2) {
      if (getDay(date) === 2) tueCount++;
      if (tueCount < 2) date = addDays(date, 1);
    }
    return date;
  }

  private getSecondSaturday(year: number, month: number): Date {
    let date = new Date(year, month, 1);
    let satCount = 0;
    while (satCount < 2) {
      if (getDay(date) === 6) satCount++;
      if (satCount < 2) date = addDays(date, 1);
    }
    return date;
  }

  private createEvent(event: RecurringEvent, date: string): RawEvent {
    return {
      title: event.name,
      startAt: `${date}T${event.time}:00`,
      venueName: event.venue,
      address: event.address,
      neighborhood: event.neighborhood,
      city: event.city || 'Miami',
      lat: event.lat,
      lng: event.lng,
      description: event.description,
      category: event.category,
      tags: event.tags,
      priceAmount: event.price,
      isOutdoor: true,
      sourceName: this.name,
      sourceUrl: event.sourceUrl,
    };
  }
}
