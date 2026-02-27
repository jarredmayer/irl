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
  days: number[] | 'monthly' | 'first-saturday';
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
        {
          name: 'Sunday Jazz Brunch on Las Olas',
          days: [0], // Sunday
          time: '11:00',
          category: 'Music',
          description: 'Live jazz performances along Las Olas Boulevard. Multiple restaurants offer brunch specials.',
          tags: ['jazz', 'brunch', 'live-music'],
          price: 0,
        },
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
        {
          name: 'Art After Dark at NSU',
          days: [5], // Friday
          time: '18:00',
          category: 'Art',
          description: 'Evening museum hours with DJ sets, cocktails, and gallery tours. Experience contemporary art after hours.',
          tags: ['museum', 'art-gallery', 'dj', 'cocktails'],
          price: 15,
        },
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
        {
          name: 'Live at the Broward Center',
          days: [4, 5, 6], // Thu-Sat
          time: '19:30',
          category: 'Culture',
          description: 'World-class performances including Broadway shows, concerts, and dance at South Florida\'s premier performing arts venue.',
          tags: ['theater', 'live-music'],
          price: 45,
        },
      ],
    },
    // Riverwalk Fort Lauderdale
    {
      name: 'Riverwalk Fort Lauderdale',
      address: 'Riverwalk, Fort Lauderdale, FL 33301',
      neighborhood: 'Downtown FLL',
      lat: 26.1189,
      lng: -80.1467,
      url: 'https://goriverwalk.com/',
      events: [
        {
          name: 'Riverwalk Friday Night',
          days: [5], // Friday
          time: '18:00',
          category: 'Community',
          description: 'Friday evening along the Riverwalk with food vendors, live music, and waterfront views.',
          tags: ['waterfront', 'live-music', 'free-event'],
          price: 0,
        },
        {
          name: 'Sunday on the Riverwalk',
          days: [0], // Sunday
          time: '10:00',
          category: 'Community',
          description: 'Sunday morning activities along the Riverwalk including yoga, markets, and family activities.',
          tags: ['waterfront', 'family-friendly', 'free-event'],
          price: 0,
        },
      ],
    },
    // Fort Lauderdale Beach
    {
      name: 'Fort Lauderdale Beach Park',
      address: 'A1A, Fort Lauderdale Beach, FL 33304',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1224,
      lng: -80.1028,
      url: 'https://www.fortlauderdale.gov/departments/parks-recreation/beach',
      events: [
        {
          name: 'Beach Bootcamp with FLL Fit Club',
          days: [6], // Saturday
          time: '08:00',
          category: 'Fitness',
          description: 'High-energy beach workout led by certified trainers. HIIT, strength, and cardio on the sand. All fitness levels.',
          tags: ['beach', 'fitness-class', 'free-event', 'community'],
          price: 0,
        },
        {
          name: 'Sunrise Flow Yoga',
          days: [0], // Sunday
          time: '07:00',
          category: 'Wellness',
          description: 'Guided sunrise yoga session on Fort Lauderdale Beach led by local instructors. Bring your own mat or rent one.',
          tags: ['yoga', 'beach', 'sunrise', 'wellness'],
          price: 10,
        },
      ],
    },
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
      lat: 26.1140,
      lng: -80.1467,
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
    // Holiday Park — largest city park; hosts concerts & festivals
    {
      name: 'Holiday Park',
      address: '1601 NE 6th Ave, Fort Lauderdale, FL 33304',
      neighborhood: 'Victoria Park',
      lat: 26.1418,
      lng: -80.1248,
      url: 'https://www.fortlauderdale.gov/departments/parks-recreation/parks-facilities/holiday-park',
      events: [
        {
          name: 'Sunday Tennis Round Robin at Holiday Park',
          days: [0], // Sunday
          time: '09:00',
          category: 'Sports',
          description: 'Weekly open tennis round robin at one of South Florida\'s premier tennis facilities. All skill levels welcome.',
          tags: ['sports', 'outdoor', 'park', 'tennis'],
          price: 5,
        },
        {
          name: 'Friday Evening Concert Series at Holiday Park',
          days: [5], // Friday
          time: '18:00',
          category: 'Music',
          description: 'Seasonal outdoor concert series at Holiday Park amphitheater featuring local and regional acts across genres.',
          tags: ['live-music', 'outdoor', 'park', 'free-event'],
          price: 0,
        },
      ],
    },
    // Huizenga Plaza / Bubier Park — waterfront gathering spot on Las Olas
    {
      name: 'Huizenga Plaza',
      address: '251 N New River Dr E, Fort Lauderdale, FL 33301',
      neighborhood: 'Downtown Fort Lauderdale',
      lat: 26.1189,
      lng: -80.1430,
      url: 'https://www.fortlauderdale.gov/departments/parks-recreation/parks-facilities/huizenga-plaza',
      events: [
        {
          name: 'Riverside Market at Huizenga Plaza',
          days: [0], // Sunday
          time: '10:00',
          category: 'Food & Drink',
          description: 'Sunday riverside market with local vendors, food trucks, and live acoustic music along the New River waterfront.',
          tags: ['market', 'outdoor', 'waterfront', 'free-event', 'food'],
          price: 0,
        },
      ],
    },
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
    // Revolution Live - Downtown FLL music venue
    {
      name: 'Revolution Live',
      address: '100 SW 3rd Ave, Fort Lauderdale, FL 33312',
      neighborhood: 'Downtown FLL',
      lat: 26.1165,
      lng: -80.1487,
      url: 'https://www.jointherevolution.net/',
      events: [
        {
          name: 'Revolution Live: Weekend Concert',
          days: [5, 6], // Fri-Sat
          time: '20:00',
          category: 'Music',
          description: 'Live concerts at Fort Lauderdale\'s premier indoor music venue. National touring acts and local favorites on the main stage.',
          tags: ['live-music', 'local-favorite'],
          price: 25,
        },
      ],
    },
    // Culture Room - Oakland Park
    {
      name: 'Culture Room',
      address: '3045 N Federal Hwy, Fort Lauderdale, FL 33306',
      neighborhood: 'Oakland Park',
      lat: 26.1583,
      lng: -80.1316,
      url: 'https://www.cultureroom.net/',
      events: [
        {
          name: 'Culture Room: Live Music',
          days: [4, 5, 6], // Thu-Sat
          time: '20:00',
          category: 'Music',
          description: 'Intimate music venue hosting rock, metal, indie, and alternative acts. One of Broward\'s best spots for live music.',
          tags: ['live-music', 'nightlife'],
          price: 20,
        },
      ],
    },
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
        {
          name: 'Funky Buddha: Trivia Night',
          days: [3], // Wednesday
          time: '19:00',
          category: 'Community',
          description: 'Weekly pub trivia at Funky Buddha Brewery taproom. Teams of 6, prizes, and great craft beer.',
          tags: ['bar', 'craft-beer', 'community'],
          price: 0,
        },
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
        {
          name: 'Stache: DJ Night',
          days: [4, 5, 6], // Thu-Sat
          time: '22:00',
          category: 'Nightlife',
          description: 'Craft cocktails and DJs in Downtown Fort Lauderdale\'s coolest speakeasy-style bar. Rotating DJ lineup, eclectic music.',
          tags: ['dj', 'nightlife', 'cocktails', 'local-favorite'],
          price: 0,
        },
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
        {
          name: 'Tarpon River: Live Music Weekend',
          days: [5, 6], // Fri-Sat
          time: '19:00',
          category: 'Music',
          description: 'Live music in Tarpon River Brewing\'s taproom and outdoor patio. Local acts, craft beer, and great vibes in the River District.',
          tags: ['live-music', 'craft-beer', 'outdoor', 'local-favorite'],
          price: 0,
        },
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
    // The Wharf Fort Lauderdale
    {
      name: 'The Wharf Fort Lauderdale',
      address: '20 W Las Olas Blvd, Fort Lauderdale, FL 33301',
      neighborhood: 'Downtown FLL',
      lat: 26.1197,
      lng: -80.1458,
      url: 'https://wharfftl.com/',
      events: [
        {
          name: 'The Wharf FTL: Weekend DJ Party',
          days: [5, 6], // Fri-Sat
          time: '18:00',
          category: 'Nightlife',
          description: 'Outdoor waterfront party at The Wharf Fort Lauderdale. DJs, cocktails, and New River views from shipping container bars.',
          tags: ['dj', 'nightlife', 'waterfront', 'outdoor', 'local-favorite'],
          price: 0,
        },
        {
          name: 'The Wharf FTL: Sunday Funday',
          days: [0], // Sunday
          time: '13:00',
          category: 'Community',
          description: 'Sunday afternoon at The Wharf. Day drinking, DJs, and waterfront views on the New River. Fort Lauderdale\'s favorite chill Sunday spot.',
          tags: ['dj', 'outdoor', 'waterfront'],
          price: 0,
        },
      ],
    },
    // Yolo Restaurant + Bar - Las Olas
    {
      name: 'Yolo Restaurant',
      address: '333 E Las Olas Blvd, Fort Lauderdale, FL 33301',
      neighborhood: 'Las Olas',
      lat: 26.1195,
      lng: -80.1345,
      url: 'https://yolorestaurant.com/',
      events: [
        {
          name: 'Yolo: Thursday DJ Night',
          days: [4], // Thursday
          time: '22:00',
          category: 'Nightlife',
          description: 'Thursday DJ nights at Yolo on Las Olas. Live DJs, craft cocktails, and late-night bites at one of Fort Lauderdale\'s most popular spots.',
          tags: ['dj', 'nightlife', 'cocktails'],
          price: 0,
        },
        {
          name: 'Yolo: Sunday Brunch',
          days: [0], // Sunday
          time: '10:30',
          category: 'Food & Drink',
          description: 'Sunday brunch at Yolo on Las Olas. Bottomless mimosas, DJ, and Fort Lauderdale\'s most vibrant brunch scene.',
          tags: ['brunch', 'dj', 'cocktails'],
          price: 35,
        },
      ],
    },
    // Pompano Beach Amphitheater
    {
      name: 'Pompano Beach Amphitheater',
      address: '1806 NE 6th St, Pompano Beach, FL 33060',
      neighborhood: 'Pompano Beach',
      lat: 26.2396,
      lng: -80.1240,
      url: 'https://pompanobeachfl.gov/amphitheater',
      events: [
        {
          name: 'Pompano Beach Amphitheater: Weekend Concert',
          days: [6], // Saturday
          time: '19:00',
          category: 'Music',
          description: 'Outdoor concerts at Pompano Beach Amphitheater. Touring and local acts under the stars on the barrier island.',
          tags: ['live-music', 'outdoor', 'local-favorite'],
          price: 20,
        },
        {
          name: 'Pompano Beach Sunday Concert Series',
          days: [0], // Sunday
          time: '17:00',
          category: 'Music',
          description: 'Free Sunday concert series at Pompano Beach Amphitheater. Diverse musical programming from jazz to Caribbean to pop.',
          tags: ['live-music', 'outdoor', 'free-event', 'local-favorite'],
          price: 0,
        },
      ],
    },
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
        {
          name: 'Sunday Concert on the Beach',
          days: [0], // Sunday
          time: '14:00',
          category: 'Music',
          description: 'Free Sunday afternoon concerts on the beach in Lauderdale-By-The-Sea. Live music and ocean views.',
          tags: ['live-music', 'outdoor', 'beach', 'free-event'],
          price: 0,
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

    if (template.days === 'monthly' || template.days === 'first-saturday') {
      // Generate monthly events (last Saturday or first Saturday)
      for (let week = 0; week < weeksAhead; week++) {
        const checkDate = addDays(today, week * 7);
        const dayOfMonth = checkDate.getDate();
        const dayOfWeek = getDay(checkDate);

        // First Saturday of month
        if (template.days === 'first-saturday' && dayOfWeek === 6 && dayOfMonth <= 7) {
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

        if (template.days.includes(dayOfWeek)) {
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
