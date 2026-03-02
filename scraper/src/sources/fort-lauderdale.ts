/**
 * Fort Lauderdale Event Sources
 * Covers Las Olas, Flagler Village, Downtown FLL, beaches, and cultural venues
 */

import { addDays, format, getDay, nextFriday, nextSaturday } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface FLLVenue {
  name: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  url?: string;
  events: FLLEventTemplate[];
}

interface FLLEventTemplate {
  name: string;
  days: number[] | 'monthly' | 'first-saturday' | 'first-friday' | 'first-weekend-jan' | 'last-weekend-feb' | 'specific-dates';
  specificDates?: string[]; // 'YYYY-MM-DD' for annual festival days
  time: string;
  category: string;
  description: string;
  tags: string[];
  price: number;
}

export class FortLauderdaleScraper extends BaseScraper {
  private venues: FLLVenue[] = [
    // Las Olas Association
    {
      name: 'Las Olas Boulevard',
      address: 'Las Olas Blvd, Fort Lauderdale, FL 33301',
      neighborhood: 'Las Olas',
      lat: 26.1195,
      lng: -80.1365,
      url: 'https://lasolasboulevard.com/',
      events: [
        {
          name: 'Las Olas Art Walk',
          days: 'first-saturday',
          time: '19:00',
          category: 'Art',
          description: 'Monthly art walk along Las Olas Boulevard featuring galleries, artists, and live entertainment.',
          tags: ['art-gallery', 'free-event', 'local-favorite'],
          price: 0,
        },
        // "Sunday Jazz Brunch on Las Olas" removed — generic suggestion, no named organizer
      ],
    },
    // Flagler Village
    {
      name: 'FAT Village Arts District',
      address: 'NW 1st Ave, Fort Lauderdale, FL 33311',
      neighborhood: 'Flagler Village',
      lat: 26.1289,
      lng: -80.1456,
      url: 'https://fatvillage.com/',
      events: [
        {
          name: 'FAT Village Art Walk',
          days: 'monthly', // Last Saturday
          time: '18:00',
          category: 'Art',
          description: 'Monthly art walk in Flagler Village featuring galleries, studios, food trucks, and live music.',
          tags: ['art-gallery', 'free-event', 'local-favorite', 'food-market'],
          price: 0,
        },
        // Flagler Village First Friday - removed (was generating every Friday incorrectly)
      ],
    },
    // NSU Art Museum
    {
      name: 'NSU Art Museum Fort Lauderdale',
      address: '1 E Las Olas Blvd, Fort Lauderdale, FL 33301',
      neighborhood: 'Downtown FLL',
      lat: 26.1189,
      lng: -80.1436,
      url: 'https://nsuartmuseum.org/',
      events: [
        {
          name: 'Free First Thursday at NSU Art Museum',
          days: [4], // Thursday (first of month - simplified)
          time: '16:00',
          category: 'Art',
          description: 'Free admission on first Thursdays with extended hours, curator talks, and special programming.',
          tags: ['museum', 'art-gallery', 'free-event'],
          price: 0,
        },
        // "Art After Dark at NSU" removed — NSU has this event but NOT every Friday (schedule-specific)
      ],
    },
    // Broward Center
    {
      name: 'Broward Center for the Performing Arts',
      address: '201 SW 5th Ave, Fort Lauderdale, FL 33312',
      neighborhood: 'Downtown FLL',
      lat: 26.1172,
      lng: -80.1489,
      url: 'https://browardcenter.org/',
      events: [
        // "Live at the Broward Center" removed — specific shows from browardcenter.org (see BrowardCenterScraper)
      ],
    },
    // Riverwalk Fort Lauderdale — goriverwalk.com runs specific events (schedule-specific, not generic)
    // "Riverwalk Friday Night" and "Sunday on the Riverwalk" removed — no named organizer
    // Fort Lauderdale Beach Park — generic fitness events removed (FLL Fit Club unknown, yoga unconfirmed)
    // Historic Stranahan House
    {
      name: 'Stranahan House Museum',
      address: '335 SE 6th Ave, Fort Lauderdale, FL 33301',
      neighborhood: 'Downtown FLL',
      lat: 26.1178,
      lng: -80.1389,
      url: 'https://stranahanhouse.org/',
      events: [
        {
          name: 'Ghost Tour at Stranahan House',
          days: [5, 6], // Fri-Sat
          time: '19:30',
          category: 'Culture',
          description: 'Candlelit ghost tour of Fort Lauderdale\'s most haunted house. Hear true tales of the Stranahan family and reported paranormal activity.',
          tags: ['museum', 'waterfront', 'local-favorite'],
          price: 30,
        },
        {
          name: 'River History Cruise & House Tour',
          days: [6], // Saturday
          time: '14:00',
          category: 'Culture',
          description: 'Boat cruise down the New River followed by a guided tour of the historic Stranahan House. Learn the pioneer history of Fort Lauderdale.',
          tags: ['museum', 'waterfront'],
          price: 40,
        },
      ],
    },
    // Bonnet House
    {
      name: 'Bonnet House Museum & Gardens',
      address: '900 N Birch Rd, Fort Lauderdale, FL 33304',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1367,
      lng: -80.1067,
      url: 'https://bonnethouse.org/',
      events: [
        {
          name: 'Full Moon Tour at Bonnet House',
          days: 'monthly',
          time: '19:00',
          category: 'Culture',
          description: 'Monthly full moon tours of the Bonnet House gardens with wine and light refreshments. Experience the estate under the moonlight.',
          tags: ['museum', 'park', 'waterfront', 'local-favorite'],
          price: 35,
        },
        {
          name: 'Birding Walk at Bonnet House',
          days: [6], // Saturday
          time: '08:30',
          category: 'Outdoors',
          description: 'Guided birding walk through 35 acres of tropical habitat. Spot monkeys, swans, and dozens of bird species with expert naturalists.',
          tags: ['park', 'outdoor', 'local-favorite'],
          price: 20,
        },
      ],
    },
    // Esplanade Park — home of the Fort Lauderdale Green Market
    {
      name: 'Esplanade Park',
      address: '400 SW 2nd St, Fort Lauderdale, FL 33312',
      neighborhood: 'Riverwalk',
      lat: 26.1165,
      lng: -80.1495,
      url: 'https://fortlauderdalegreenmarket.com/',
      events: [
        {
          name: 'Fort Lauderdale Green Market',
          days: [6], // Saturday
          time: '08:00',
          category: 'Food & Drink',
          description: 'Open-air farmers market along the New River with local produce, artisan food, plants, and handmade goods. A beloved Saturday morning tradition.',
          tags: ['farmers-market', 'free-event', 'outdoor', 'local-favorite', 'food'],
          price: 0,
        },
      ],
    },
    // Holiday Park — tennis round robin and concert series removed (not confirmed recurring public events)
    // Huizenga Plaza — Riverside Market removed (no confirmed organizer for this market)
    // Sistrunk Marketplace & Brewery
    {
      name: 'Sistrunk Marketplace & Brewery',
      address: '1556 NW Sistrunk Blvd, Fort Lauderdale, FL 33311',
      neighborhood: 'Sistrunk',
      lat: 26.1262,
      lng: -80.1557,
      url: 'https://www.sistrunkmarketplace.com/',
      events: [
        {
          name: 'Sistrunk Saturday Night Market',
          days: [6], // Saturday
          time: '17:00',
          category: 'Food & Drink',
          description: 'Vibrant outdoor market and food hall in the historic Sistrunk corridor. Local food vendors, craft beer, live DJs, and artisan makers.',
          tags: ['market', 'outdoor', 'food', 'nightlife', 'local-favorite'],
          price: 0,
        },
        {
          name: 'Trivia Night at Sistrunk Brewery',
          days: [3], // Wednesday
          time: '19:00',
          category: 'Entertainment',
          description: 'Weekly pub trivia in a lively craft brewery setting. Form your team and compete for prizes while enjoying local craft brews.',
          tags: ['trivia', 'bar', 'nightlife'],
          price: 0,
        },
      ],
    },
    // Las Olas Oceanside Park (formerly "Las Olas Beach")
    {
      name: 'Las Olas Oceanside Park',
      address: '3000 E Las Olas Blvd, Fort Lauderdale, FL 33316',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1199,
      lng: -80.0974,
      url: 'https://www.fortlauderdale.gov/departments/parks-recreation/parks-facilities/las-olas-oceanside-park',
      events: [
        {
          name: 'Sunday Sunrise Yoga on the Beach',
          days: [0], // Sunday
          time: '07:30',
          category: 'Wellness',
          description: 'Free community yoga class at oceanside park facing the Atlantic. Bring a mat and enjoy the breeze.',
          tags: ['yoga', 'beach', 'outdoor', 'free-event', 'wellness'],
          price: 0,
        },
      ],
    },
    // Revolution Live — venue confirmed, but "Weekend Concert" is generic (no named act)
    // TODO: add specific shows when they appear on jointherevolution.net calendar
    // Culture Room — venue confirmed, but "Live Music" is generic (no named act)
    // TODO: add specific shows when they appear on cultureroom.net calendar
    // Funky Buddha Brewery - Oakland Park
    {
      name: 'Funky Buddha Brewery',
      address: '1201 NE 38th St, Oakland Park, FL 33334',
      neighborhood: 'Oakland Park',
      lat: 26.1679,
      lng: -80.1357,
      url: 'https://www.funkybuddhabrewery.com/',
      events: [
        {
          name: 'Funky Buddha: Weekend Brewery Tour & Tasting',
          days: [6, 0], // Sat-Sun
          time: '13:00',
          category: 'Food & Drink',
          description: 'Tour the Funky Buddha brewery and sample award-winning craft beers including the legendary Maple Bacon Coffee Porter.',
          tags: ['craft-beer', 'local-favorite', 'outdoor'],
          price: 15,
        },
        // Funky Buddha Trivia Night removed — no confirmed organizer or day verified
      ],
    },
    // Stache Drinking Den - Downtown FLL
    {
      name: 'Stache Drinking Den + Coffee Bar',
      address: '109 SW 2nd Ave, Fort Lauderdale, FL 33312',
      neighborhood: 'Downtown FLL',
      lat: 26.1168,
      lng: -80.1467,
      url: 'https://www.stachedrinkingden.com/',
      events: [
        // Stache DJ Night removed — generic (no named DJs confirmed)
        {
          name: 'Stache: Industry Monday',
          days: [1], // Monday
          time: '21:00',
          category: 'Nightlife',
          description: 'Industry Monday at Stache. Discounts for hospitality workers, DJ sets, and late-night fun in Downtown FLL.',
          tags: ['dj', 'nightlife', 'cocktails'],
          price: 0,
        },
      ],
    },
    // Tarpon River Brewing
    {
      name: 'Tarpon River Brewing',
      address: '280 SW 6th St, Fort Lauderdale, FL 33312',
      neighborhood: 'Downtown FLL',
      lat: 26.1136,
      lng: -80.1467,
      url: 'https://tarponriverbrewing.com/',
      events: [
        // Tarpon River Live Music Weekend removed — generic (no named acts confirmed)
        {
          name: 'Tarpon River: Open Mic Wednesday',
          days: [3], // Wednesday
          time: '19:00',
          category: 'Music',
          description: 'Weekly open mic night at Tarpon River Brewing. Acoustic sets, original music, and great local craft beer.',
          tags: ['live-music', 'community', 'craft-beer'],
          price: 0,
        },
      ],
    },
    // The Wharf Fort Lauderdale — venue confirmed but DJ Party/Sunday Funday are generic templates
    // TODO: add specific events from wharfftl.com calendar
    // Yolo Restaurant + Bar — coordinates need verification, DJ Night/Brunch are generic templates
    // TODO: get correct lat/lng (current -80.1338 may be too far east) and confirmed specific events
    // Pompano Beach Amphitheater — generic "Weekend Concert" and "Sunday Concert Series" removed
    // TODO: add specific events from pompanobeachfl.gov/amphitheater calendar
    // Lauderdale-By-The-Sea
    {
      name: 'El Mar Drive Beach',
      address: 'El Mar Dr, Lauderdale-By-The-Sea, FL 33308',
      neighborhood: 'Lauderdale-By-The-Sea',
      lat: 26.1862,
      lng: -80.0974,
      url: 'https://www.lauderdalebythesea-fl.gov/',
      events: [
        {
          name: 'Lauderdale-by-the-Sea Craft Fair',
          days: 'first-saturday',
          time: '09:00',
          category: 'Community',
          description: 'Monthly craft fair in the charming beach village of Lauderdale-By-The-Sea. Local art, jewelry, crafts, and food by the ocean.',
          tags: ['outdoor', 'beach', 'market', 'local-favorite', 'free-event'],
          price: 0,
        },
        // Sunday Concert on the Beach removed — no confirmed organizer or confirmed schedule
      ],
    },
    // Las Olas Art Fair (bi-annual: first weekend Jan + last weekend Feb)
    {
      name: 'Las Olas Art Fair',
      address: 'E Las Olas Blvd (SE 6th–11th Ave), Fort Lauderdale, FL 33301',
      neighborhood: 'Las Olas',
      lat: 26.1196,
      lng: -80.1295,
      url: 'https://www.artfestival.com/festivals/las-olas-art-fair-fort-lauderdale-florida',
      events: [
        {
          name: 'Las Olas Art Fair – Part I (January)',
          days: 'first-weekend-jan',
          time: '10:00',
          category: 'Art',
          description: 'One of the nation\'s top 100 outdoor art festivals. 200+ juried artists line a mile of Las Olas Blvd with paintings, sculpture, jewelry, and more. Free admission.',
          tags: ['art-gallery', 'free-event', 'outdoor', 'local-favorite', 'festival'],
          price: 0,
        },
        {
          name: 'Las Olas Art Fair – Part II (February)',
          days: 'last-weekend-feb',
          time: '10:00',
          category: 'Art',
          description: 'One of the nation\'s top 100 outdoor art festivals. 200+ juried artists line a mile of Las Olas Blvd with paintings, sculpture, jewelry, and more. Free admission.',
          tags: ['art-gallery', 'free-event', 'outdoor', 'local-favorite', 'festival'],
          price: 0,
        },
      ],
    },
    // Pride Fort Lauderdale — annually mid-February on the beach
    {
      name: 'Pride Fort Lauderdale',
      address: 'A1A (Fort Lauderdale Beach Blvd), Fort Lauderdale, FL 33304',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1240,
      lng: -80.1030,
      url: 'https://www.pridefortlauderdale.org/',
      events: [
        {
          name: 'Pride Fort Lauderdale: Beach Festival',
          days: 'specific-dates',
          specificDates: ['2026-02-14', '2026-02-15', '2027-02-13', '2027-02-14'],
          time: '12:00',
          category: 'Community',
          description: 'Florida\'s oldest Pride celebration. Two-day beach festival on A1A with 3 stages, 150+ vendors, headlining performers, DJs, and the GAY1A parade. 120,000+ attendees. Free.',
          tags: ['free-event', 'outdoor', 'beach', 'community', 'festival', 'lgbtq', 'live-music'],
          price: 0,
        },
      ],
    },
    // Tortuga Music Festival — annual April, Fort Lauderdale Beach
    {
      name: 'Tortuga Music Festival',
      address: 'Fort Lauderdale Beach Park, Fort Lauderdale, FL 33304',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1224,
      lng: -80.1028,
      url: 'https://www.tortugamusicfestival.com/',
      events: [
        {
          name: 'Tortuga Music Festival',
          days: 'specific-dates',
          specificDates: ['2026-04-10', '2026-04-11', '2026-04-12'],
          time: '12:00',
          category: 'Music',
          description: 'Three-day country and rock festival on Fort Lauderdale Beach benefiting ocean conservation. Major headliners, food, and beachside stages.',
          tags: ['live-music', 'outdoor', 'beach', 'festival', 'local-favorite'],
          price: 150,
        },
      ],
    },
    // Fort Lauderdale International Boat Show — annual late October
    {
      name: 'Fort Lauderdale International Boat Show',
      address: 'Bahia Mar Yachting Center, 801 Seabreeze Blvd, Fort Lauderdale, FL 33316',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1162,
      lng: -80.1054,
      url: 'https://www.flibs.com/',
      events: [
        {
          name: 'Fort Lauderdale International Boat Show (FLIBS)',
          days: 'specific-dates',
          specificDates: ['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'],
          time: '10:00',
          category: 'Culture',
          description: 'The world\'s largest in-water boat show. 90 acres, 3M+ sq ft of exhibit space, 100,000+ visitors. Superyachts, luxury boats, and marine technology across 7 waterfront locations.',
          tags: ['outdoor', 'waterfront', 'festival', 'local-favorite'],
          price: 40,
        },
      ],
    },
    // Winterfest Boat Parade — annual December
    {
      name: 'Winterfest Boat Parade',
      address: 'Fort Lauderdale Intracoastal Waterway, Fort Lauderdale, FL 33301',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1230,
      lng: -80.1050,
      url: 'https://www.winterfestparade.com/',
      events: [
        {
          name: 'Seminole Hard Rock Winterfest Boat Parade',
          days: 'specific-dates',
          specificDates: ['2025-12-13', '2026-12-12'],
          time: '18:00',
          category: 'Community',
          description: '"The Best Show on H2O." Holiday-lit boats parade 12 miles through Fort Lauderdale\'s waterways. Mega-yachts, sailboats, and holiday spectacle. Free to watch from the banks.',
          tags: ['waterfront', 'outdoor', 'free-event', 'festival', 'local-favorite', 'family-friendly'],
          price: 0,
        },
      ],
    },
    // St. Patrick's Day Parade — annual mid-March
    {
      name: 'Fort Lauderdale St. Patrick\'s Day Parade',
      address: 'Las Olas Blvd, Fort Lauderdale, FL 33301',
      neighborhood: 'Las Olas',
      lat: 26.1195,
      lng: -80.1365,
      url: 'https://www.visitlauderdale.com/events/annual-events-festivals/',
      events: [
        {
          name: 'Fort Lauderdale St. Patrick\'s Day Parade & Festival',
          days: 'specific-dates',
          specificDates: ['2026-03-14', '2027-03-13'],
          time: '11:00',
          category: 'Community',
          description: 'Annual St. Patrick\'s Day parade and street festival through downtown Fort Lauderdale. Marching bands, floats, Irish food and drinks, live music.',
          tags: ['free-event', 'outdoor', 'community', 'festival', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // Brazilian Festival FLL — annual October
    {
      name: 'Brazilian Festival Fort Lauderdale',
      address: 'Esplanade Park, 400 SW 2nd St, Fort Lauderdale, FL 33312',
      neighborhood: 'Riverwalk',
      lat: 26.1165,
      lng: -80.1495,
      url: 'https://www.visitlauderdale.com/events/annual-events-festivals/',
      events: [
        {
          name: 'Brazilian Festival Fort Lauderdale',
          days: 'specific-dates',
          specificDates: ['2026-10-03', '2026-10-04'],
          time: '12:00',
          category: 'Culture',
          description: 'Annual Brazilian cultural festival in downtown Fort Lauderdale. Live samba, forró, food, art, and community celebrating South Florida\'s vibrant Brazilian community.',
          tags: ['free-event', 'outdoor', 'live-music', 'community', 'festival', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // ── WeekendBroward-sourced events (verified via Google index) ──────
    // weekendbroward.com is Cloudflare-blocked; events confirmed through
    // Google search index of their site content.
    {
      name: 'Fort Lauderdale Beach (Sound Waves Stage)',
      address: 'A1A & Las Olas Blvd, Fort Lauderdale, FL 33316',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1199,
      lng: -80.0974,
      url: 'https://weekendbroward.com/10-years-of-free-concerts-on-fort-lauderdale-beach/',
      events: [
        {
          name: 'Friday Night Sound Waves',
          days: [5], // Friday
          time: '18:30',
          category: 'Music',
          description: 'Free beachfront concert series on Fort Lauderdale Beach — now celebrating its 10th anniversary season. Live music, ocean breezes, and community vibes every Friday. Presented by DiscoverFTLBeach.com.',
          tags: ['live-music', 'free-event', 'beach', 'outdoor', 'local-favorite'],
          price: 0,
        },
      ],
    },
    {
      name: 'Pine Island Park',
      address: '200 NW 59th Terrace, Plantation, FL 33317',
      neighborhood: 'Plantation',
      lat: 26.1253,
      lng: -80.2457,
      url: 'https://weekendbroward.com/events/',
      events: [
        {
          name: 'Rock the Park — Plantation',
          days: 'first-friday',
          time: '19:00',
          category: 'Music',
          description: 'Free monthly concert series at Pine Island Park in Plantation. Tribute bands covering rock legends — past performers include tributes to Stevie Wonder, Led Zeppelin, and Blues Traveler.',
          tags: ['live-music', 'free-event', 'outdoor', 'family-friendly', 'local-favorite'],
          price: 0,
        },
      ],
    },
    {
      name: 'Lauderdale-By-The-Sea Town Center',
      address: 'Commercial Blvd & A1A, Lauderdale-By-The-Sea, FL 33308',
      neighborhood: 'Lauderdale-By-The-Sea',
      lat: 26.1923,
      lng: -80.0971,
      url: 'https://weekendbroward.com/live-music/',
      events: [
        {
          name: 'Friday Night Music — Lauderdale-By-The-Sea',
          days: [5], // Friday
          time: '18:00',
          category: 'Music',
          description: 'Free live music in the beach village of Lauderdale-By-The-Sea. Stage at Commercial Blvd and A1A with ocean views, local restaurants, and community vibes.',
          tags: ['live-music', 'free-event', 'outdoor', 'beach', 'local-favorite'],
          price: 0,
        },
      ],
    },
    {
      name: 'Esplanade Park',
      address: '400 SW 2nd St, Fort Lauderdale, FL 33312',
      neighborhood: 'Riverwalk',
      lat: 26.1165,
      lng: -80.1495,
      url: 'https://weekendbroward.com/events/rhythm-by-the-river-a-celebration-of-local-voices/',
      events: [
        {
          name: 'Rhythm by the River — Broward Center',
          days: 'specific-dates',
          specificDates: ['2026-02-22'],
          time: '14:00',
          category: 'Music',
          description: 'Annual free community event by the Broward Center for the Performing Arts. Celebrating local voices with live music at Esplanade Park in downtown Fort Lauderdale.',
          tags: ['live-music', 'free-event', 'outdoor', 'community', 'local-favorite'],
          price: 0,
        },
      ],
    },
    {
      name: 'Pompano Beach Amphitheater',
      address: '1801 NE 6th St, Pompano Beach, FL 33060',
      neighborhood: 'Pompano Beach',
      lat: 26.2412,
      lng: -80.1150,
      url: 'https://weekendbroward.com/events/jazz-fest-pompano-beach/',
      events: [
        {
          name: 'Jazz Fest Pompano Beach',
          days: 'specific-dates',
          specificDates: ['2026-04-18', '2026-04-19'],
          time: '12:00',
          category: 'Music',
          description: '5th Annual Jazz Fest Pompano Beach — two days of world-class performances by Grammy winners and local talent along the stunning shoreline. Free to the public.',
          tags: ['jazz', 'live-music', 'free-event', 'outdoor', 'festival', 'local-favorite'],
          price: 0,
        },
      ],
    },
    {
      name: 'Jaco Pastorius Park',
      address: '4000 N Dixie Hwy, Oakland Park, FL 33334',
      neighborhood: 'Oakland Park',
      lat: 26.1656,
      lng: -80.1478,
      url: 'https://weekendbroward.com/events/south-florida-margarita-festival/',
      events: [
        {
          name: 'South Florida Margarita Festival',
          days: 'specific-dates',
          specificDates: ['2026-02-21'],
          time: '17:00',
          category: 'Food & Drink',
          description: 'A vibrant evening of flavor, music, and celebration in Oakland Park. Margarita tastings, live music, and food trucks.',
          tags: ['food', 'live-music', 'outdoor', 'festival'],
          price: 25,
        },
      ],
    },
  ];

  constructor() {
    super('Fort Lauderdale', { weight: 1.3, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const weeksAhead = 6;

    this.log(`Generating Fort Lauderdale events for next ${weeksAhead} weeks...`);

    for (const venue of this.venues) {
      for (const template of venue.events) {
        const generated = this.generateEvents(venue, template, weeksAhead);
        events.push(...generated);
      }
    }

    this.log(`Generated ${events.length} Fort Lauderdale events`);
    return events;
  }

  private generateEvents(
    venue: FLLVenue,
    template: FLLEventTemplate,
    weeksAhead: number
  ): RawEvent[] {
    const events: RawEvent[] = [];
    const today = new Date();
    const daysToCheck = weeksAhead * 7;

    if (template.days === 'specific-dates' && template.specificDates) {
      const windowEnd = addDays(today, weeksAhead * 7);
      for (const dateStr of template.specificDates) {
        const d = new Date(`${dateStr}T${template.time}:00`);
        if (d >= today && d <= windowEnd) {
          events.push(this.createEvent(venue, template, d));
        }
      }
    } else if (template.days === 'first-weekend-jan' || template.days === 'last-weekend-feb') {
      // Bi-annual festival events: generate Sat+Sun for the target weekend in the window
      for (let i = 0; i < daysToCheck; i++) {
        const checkDate = addDays(today, i);
        const month = checkDate.getMonth(); // 0=Jan, 1=Feb
        const day = checkDate.getDate();
        const dow = getDay(checkDate);
        if (template.days === 'first-weekend-jan' && month === 0 && day <= 7 && (dow === 6 || dow === 0)) {
          events.push(this.createEvent(venue, template, checkDate));
        }
        if (template.days === 'last-weekend-feb') {
          // Last Saturday of Feb (day >= 22) and the Sunday that follows (may be March 1/2)
          const isFebLastSat = month === 1 && dow === 6 && day >= 22;
          const isSundayAfterFebLastSat = dow === 0 && (
            (month === 1 && day >= 23) ||
            (month === 2 && day <= 2)
          );
          if (isFebLastSat || isSundayAfterFebLastSat) {
            events.push(this.createEvent(venue, template, checkDate));
          }
        }
      }
    } else if (template.days === 'monthly' || template.days === 'first-saturday' || template.days === 'first-friday') {
      // Generate monthly events
      for (let i = 0; i < daysToCheck; i++) {
        const checkDate = addDays(today, i);
        const dayOfMonth = checkDate.getDate();
        const dayOfWeek = getDay(checkDate);

        // First Saturday of month
        if (template.days === 'first-saturday' && dayOfWeek === 6 && dayOfMonth <= 7) {
          events.push(this.createEvent(venue, template, checkDate));
        }
        // First Friday of month
        if (template.days === 'first-friday' && dayOfWeek === 5 && dayOfMonth <= 7) {
          events.push(this.createEvent(venue, template, checkDate));
        }
        // Last Saturday of month (simplified: 4th Saturday)
        if (template.days === 'monthly' && dayOfWeek === 6 && dayOfMonth >= 22) {
          events.push(this.createEvent(venue, template, checkDate));
        }
      }
    } else {
      // Regular weekly events
      for (let i = 0; i < daysToCheck; i++) {
        const checkDate = addDays(today, i);
        const dayOfWeek = getDay(checkDate);

        if ((template.days as number[]).includes(dayOfWeek)) {
          events.push(this.createEvent(venue, template, checkDate));
        }
      }
    }

    return events;
  }

  private createEvent(venue: FLLVenue, template: FLLEventTemplate, date: Date): RawEvent {
    const dateStr = format(date, 'yyyy-MM-dd');
    const startAt = `${dateStr}T${template.time}:00`;

    return {
      title: template.name,
      startAt,
      venueName: venue.name,
      address: venue.address,
      neighborhood: venue.neighborhood,
      lat: venue.lat,
      lng: venue.lng,
      city: 'Fort Lauderdale',
      tags: template.tags,
      category: template.category,
      priceLabel: template.price === 0 ? 'Free' : template.price < 20 ? '$' : '$$',
      priceAmount: template.price,
      isOutdoor: template.tags.includes('beach') || template.tags.includes('park') || template.tags.includes('waterfront'),
      description: template.description,
      sourceUrl: venue.url,
      sourceName: this.name,
      recurring: true,
      recurrencePattern: 'weekly',
    };
  }
}
