/**
 * Instagram Event Sources
 * Framework for monitoring Instagram accounts for events
 *
 * Note: Direct Instagram scraping requires authentication.
 * This module provides:
 * 1. Known recurring events from monitored accounts
 * 2. Framework for manual event entry from Instagram posts
 * 3. Hooks for future Instagram API/scraping integration
 */

import { addDays, format, getDay, lastDayOfMonth } from 'date-fns';
import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface InstagramAccount {
  handle: string;
  name: string;
  city: 'Miami' | 'Fort Lauderdale';
  category: string;
  knownEvents: KnownEvent[];
}

interface KnownEvent {
  name: string;
  venue?: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  schedule: 'weekly' | 'monthly' | 'last-friday';
  days?: number[];
  time: string;
  description: string;
  tags: string[];
  price: number;
  category?: string; // Overrides account-level category for this event
}

export class InstagramSourcesScraper extends BaseScraper {
  private accounts: InstagramAccount[] = [
    // @fortlauderdaledowntown
    {
      handle: 'fortlauderdaledowntown',
      name: 'Downtown Fort Lauderdale',
      city: 'Fort Lauderdale',
      category: 'Community',
      knownEvents: [
        {
          name: 'First Friday Art Walk',
          venue: 'Downtown Fort Lauderdale',
          address: 'SW 2nd St, Fort Lauderdale, FL 33301',
          neighborhood: 'Downtown FLL',
          lat: 26.1189,
          lng: -80.1456,
          schedule: 'monthly',
          time: '18:00',
          description: 'Monthly art walk in downtown Fort Lauderdale featuring galleries, live music, and food vendors.',
          tags: ['art-gallery', 'free-event', 'local-favorite'],
          price: 0,
        },
        {
          name: 'Downtown FLL Food Truck Rally',
          venue: 'Huizenga Plaza',
          address: '32 E Las Olas Blvd, Fort Lauderdale, FL 33301',
          neighborhood: 'Downtown FLL',
          lat: 26.1189,
          lng: -80.1436,
          schedule: 'weekly',
          days: [5], // Friday
          time: '17:30',
          description: 'Weekly food truck gathering in downtown Fort Lauderdale. Live music and family-friendly.',
          tags: ['food-market', 'free-event', 'family-friendly'],
          price: 0,
        },
        {
          name: 'Sunday Jazz Brunch Downtown',
          venue: 'Riverwalk Fort Lauderdale',
          address: 'Riverwalk, Fort Lauderdale, FL 33301',
          neighborhood: 'Downtown FLL',
          lat: 26.1189,
          lng: -80.1467,
          schedule: 'weekly',
          days: [0], // Sunday
          time: '11:00',
          category: 'Music',
          description: 'Live jazz along the Riverwalk with brunch specials at nearby restaurants.',
          tags: ['jazz', 'brunch', 'waterfront', 'free-event'],
          price: 0,
        },
      ],
    },
    // @wynaborhood
    {
      handle: 'wynaborhood',
      name: 'Wynwood Neighborhood',
      city: 'Miami',
      category: 'Art',
      knownEvents: [
        {
          name: 'Wynwood Second Saturday Art Walk',
          venue: 'Wynwood Arts District',
          address: 'NW 2nd Ave, Miami, FL 33127',
          neighborhood: 'Wynwood',
          lat: 25.8011,
          lng: -80.1996,
          schedule: 'monthly',
          time: '18:00',
          description: 'Monthly art walk through Wynwood galleries. Extended hours, new exhibitions, and street performances.',
          tags: ['art-gallery', 'free-event', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // @baborhood (Brickell)
    {
      handle: 'baborhood',
      name: 'Brickell Neighborhood',
      city: 'Miami',
      category: 'Community',
      knownEvents: [
        {
          name: 'Brickell Night Market',
          venue: 'Brickell City Centre',
          address: '701 S Miami Ave, Miami, FL 33131',
          neighborhood: 'Brickell',
          lat: 25.7672,
          lng: -80.1936,
          schedule: 'monthly',
          time: '18:00',
          description: 'Monthly night market at Brickell City Centre featuring local vendors and artisans.',
          tags: ['food-market', 'free-event'],
          price: 0,
        },
      ],
    },
    // @themiamiflea
    {
      handle: 'themiamiflea',
      name: 'The Miami Flea',
      city: 'Miami',
      category: 'Community',
      knownEvents: [
        {
          name: 'The Miami Flea Market',
          venue: 'Various Miami Locations',
          address: 'Miami, FL',
          neighborhood: 'Miami',
          lat: 25.7617,
          lng: -80.1918,
          schedule: 'monthly',
          time: '11:00',
          description: 'Monthly artisan market featuring local makers, vintage vendors, food trucks, and live music.',
          tags: ['food-market', 'local-favorite', 'free-event'],
          price: 0,
        },
      ],
    },
    // @criticalmassmiami
    {
      handle: 'criticalmassmiami',
      name: 'Critical Mass Miami',
      city: 'Miami',
      category: 'Fitness',
      knownEvents: [
        {
          name: 'Critical Mass Miami',
          venue: 'Government Center',
          address: '111 NW 1st St, Miami, FL 33128',
          neighborhood: 'Downtown Miami',
          lat: 25.7754,
          lng: -80.1938,
          schedule: 'last-friday',
          time: '19:00',
          description: 'Monthly bike ride through Miami streets. Meet at Government Center. All welcome!',
          tags: ['cycling', 'free-event', 'community', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // @mikiaminightlife (nightlife events)
    {
      handle: 'mikiaminightlife',
      name: 'Miami Nightlife',
      city: 'Miami',
      category: 'Nightlife',
      knownEvents: [
        // Events from this account are more ad-hoc
        // Would need Instagram API to track
      ],
    },
    // @gramps_miami - Wynwood bar / music venue
    {
      handle: 'gramps_miami',
      name: 'Gramps Miami',
      city: 'Miami',
      category: 'Music',
      knownEvents: [
        {
          name: 'Gramps: Reggae Wednesday',
          venue: 'Gramps',
          address: '176 NW 24th St, Miami, FL 33127',
          neighborhood: 'Wynwood',
          lat: 25.8010,
          lng: -80.1979,
          schedule: 'weekly',
          days: [3], // Wednesday
          time: '22:00',
          description: 'Weekly reggae night at Gramps. Live DJs, drink specials, and the best outdoor patio in Wynwood.',
          tags: ['dj', 'nightlife', 'local-favorite', 'dancing'],
          price: 0,
        },
        {
          name: 'Gramps: Live Music Friday',
          venue: 'Gramps',
          address: '176 NW 24th St, Miami, FL 33127',
          neighborhood: 'Wynwood',
          lat: 25.8010,
          lng: -80.1979,
          schedule: 'weekly',
          days: [5], // Friday
          time: '22:00',
          description: 'Live bands and DJs on the Gramps stage. Local and touring acts in Wynwood\'s most eclectic music venue.',
          tags: ['live-music', 'nightlife', 'local-favorite'],
          price: 10,
        },
        {
          name: 'Gramps: Trivia Tuesday',
          venue: 'Gramps',
          address: '176 NW 24th St, Miami, FL 33127',
          neighborhood: 'Wynwood',
          lat: 25.8010,
          lng: -80.1979,
          schedule: 'weekly',
          days: [2], // Tuesday
          time: '20:00',
          description: 'Weekly bar trivia at Gramps. Teams of up to 6 compete for bar tabs. Miami\'s most fun Tuesday night.',
          tags: ['bar', 'community', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // @lasrosasmiami - Allapattah bar
    {
      handle: 'lasrosasmiami',
      name: 'Las Rosas Miami',
      city: 'Miami',
      category: 'Nightlife',
      knownEvents: [
        {
          name: 'Las Rosas: DJ Night',
          venue: 'Las Rosas',
          address: '2898 NW 7th Ave, Miami, FL 33127',
          neighborhood: 'Allapattah',
          lat: 25.7972,
          lng: -80.2050,
          schedule: 'weekly',
          days: [5, 6], // Fri-Sat
          time: '22:00',
          description: 'Rotating DJs spinning everything from cumbia to techno. One of Miami\'s coolest neighborhood bars in Allapattah.',
          tags: ['dj', 'nightlife', 'local-favorite', 'dancing', 'underground'],
          price: 0,
        },
      ],
    },
    // @churchillspub_miami - Little Haiti
    {
      handle: 'churchillspub',
      name: "Churchill's Pub",
      city: 'Miami',
      category: 'Music',
      knownEvents: [
        {
          name: "Churchill's: Live Music Weekend",
          venue: "Churchill's Pub",
          address: '5501 NE 2nd Ave, Miami, FL 33137',
          neighborhood: 'Little Haiti',
          lat: 25.8255,
          lng: -80.1859,
          schedule: 'weekly',
          days: [5, 6], // Fri-Sat
          time: '21:00',
          description: "Live bands at Miami's legendary dive bar. Rock, punk, indie, and everything in between since 1979.",
          tags: ['live-music', 'nightlife', 'local-favorite'],
          price: 10,
        },
        {
          name: "Churchill's: Open Mic Wednesday",
          venue: "Churchill's Pub",
          address: '5501 NE 2nd Ave, Miami, FL 33137',
          neighborhood: 'Little Haiti',
          lat: 25.8255,
          lng: -80.1859,
          schedule: 'weekly',
          days: [3], // Wednesday
          time: '20:00',
          description: "Wednesday open mic at Churchill's. Sign up to perform or enjoy Miami's underground music scene.",
          tags: ['live-music', 'community', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // @lagniappe_miami - Wine & jazz bar
    {
      handle: 'lagniappe_miami',
      name: 'Lagniappe House',
      city: 'Miami',
      category: 'Music',
      knownEvents: [
        {
          name: 'Lagniappe: Jazz & Wine',
          venue: 'Lagniappe House',
          address: '3425 NE 2nd Ave, Miami, FL 33137',
          neighborhood: 'Midtown',
          lat: 25.8089,
          lng: -80.1917,
          schedule: 'weekly',
          days: [4, 5, 6, 0], // Thu-Sun
          time: '20:00',
          description: 'Live jazz in an intimate wine-bar setting. Rotating wine list, cheese boards, and nightly jazz acts in this beloved Miami institution.',
          tags: ['jazz', 'live-music', 'wine-tasting', 'local-favorite', 'intimate'],
          price: 0,
        },
      ],
    },
    // @thewharfmiami - Brickell waterfront
    {
      handle: 'thewharfmiami',
      name: 'The Wharf Miami',
      city: 'Miami',
      category: 'Nightlife',
      knownEvents: [
        {
          name: 'The Wharf Miami: Weekend DJ Party',
          venue: 'The Wharf Miami',
          address: '114 SW North River Dr, Miami, FL 33130',
          neighborhood: 'Brickell',
          lat: 25.7692,
          lng: -80.1994,
          schedule: 'weekly',
          days: [5, 6], // Fri-Sat
          time: '18:00',
          description: 'Outdoor waterfront party at The Wharf. DJs, shipping container bars, food trucks, and Miami River views.',
          tags: ['dj', 'nightlife', 'waterfront', 'outdoor', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // @pamm_museum - Pérez Art Museum Miami
    {
      handle: 'pamm_museum',
      name: 'Pérez Art Museum Miami',
      city: 'Miami',
      category: 'Art',
      knownEvents: [
        {
          name: 'PAMM: Free First Thursday',
          venue: 'Pérez Art Museum Miami',
          address: '1103 Biscayne Blvd, Miami, FL 33132',
          neighborhood: 'Downtown Miami',
          lat: 25.7748,
          lng: -80.1856,
          schedule: 'monthly',
          time: '12:00',
          description: "Free admission every first Thursday 12-9pm. Extended programming, docent-led tours, and community events on Museum Park's waterfront campus.",
          tags: ['museum', 'art-gallery', 'free-event', 'waterfront', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // @northbeachbandshell - North Beach outdoor venue
    {
      handle: 'northbeachbandshell',
      name: 'North Beach Bandshell',
      city: 'Miami',
      category: 'Music',
      knownEvents: [
        {
          name: 'Live at the Bandshell: Weekend Concert',
          venue: 'North Beach Bandshell',
          address: '7275 Collins Ave, Miami Beach, FL 33141',
          neighborhood: 'North Beach',
          lat: 25.8490,
          lng: -80.1220,
          schedule: 'weekly',
          days: [5, 6], // Fri-Sat
          time: '19:00',
          description: 'Outdoor concerts at the beloved North Beach Bandshell amphitheater. Local and international artists under the stars on Miami Beach.',
          tags: ['live-music', 'outdoor', 'local-favorite', 'beach', 'free-event'],
          price: 0,
        },
      ],
    },
    // @wynwoodwalls - Street art museum
    {
      handle: 'wynwoodwalls',
      name: 'Wynwood Walls',
      city: 'Miami',
      category: 'Art',
      knownEvents: [
        {
          name: 'Wynwood Walls: Second Saturday Art Walk',
          venue: 'Wynwood Walls',
          address: '2520 NW 2nd Ave, Miami, FL 33127',
          neighborhood: 'Wynwood',
          lat: 25.8016,
          lng: -80.1992,
          schedule: 'monthly',
          time: '18:00',
          description: 'Monthly art walk through Wynwood with extended hours at the Walls. New murals, artist talks, and live music in the garden.',
          tags: ['art-gallery', 'outdoor', 'local-favorite', 'live-music', 'free-event'],
          price: 0,
        },
      ],
    },
    // @wiltonmanorsfl - Wilton Manors FLL
    {
      handle: 'wiltonmanorsfl',
      name: 'Wilton Manors',
      city: 'Fort Lauderdale',
      category: 'Community',
      knownEvents: [
        {
          name: 'Wilton Drive: Sunday Stroll',
          venue: 'Wilton Drive',
          address: 'Wilton Dr, Wilton Manors, FL 33305',
          neighborhood: 'Wilton Manors',
          lat: 26.1563,
          lng: -80.1379,
          schedule: 'weekly',
          days: [0], // Sunday
          time: '11:00',
          description: "Sunday stroll down Wilton Drive with brunch spots, pop-up vendors, and Wilton Manors' welcoming community atmosphere.",
          tags: ['outdoor', 'community', 'local-favorite', 'brunch'],
          price: 0,
        },
      ],
    },
    // @thefernbarftl - Fort Lauderdale cocktail bar
    {
      handle: 'thefernbarftl',
      name: 'The Fern Bar FTL',
      city: 'Fort Lauderdale',
      category: 'Nightlife',
      knownEvents: [
        {
          name: 'The Fern Bar: Weekend DJ',
          venue: 'The Fern Bar',
          address: '700 N Andrews Ave, Fort Lauderdale, FL 33311',
          neighborhood: 'Flagler Village',
          lat: 26.1289,
          lng: -80.1456,
          schedule: 'weekly',
          days: [5, 6], // Fri-Sat
          time: '21:00',
          description: "Weekend DJ nights at The Fern Bar in Flagler Village. Craft cocktails, eclectic music, and Fort Lauderdale's coolest crowd.",
          tags: ['dj', 'nightlife', 'cocktails', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // @miamirunclub - Community fitness
    {
      handle: 'miamirunclub',
      name: 'Miami Run Club',
      city: 'Miami',
      category: 'Fitness',
      knownEvents: [
        {
          name: 'Miami Run Club: Saturday Morning Run',
          venue: 'Bayfront Park',
          address: '301 Biscayne Blvd, Miami, FL 33132',
          neighborhood: 'Downtown Miami',
          lat: 25.7733,
          lng: -80.1867,
          schedule: 'weekly',
          days: [6], // Saturday
          time: '07:00',
          description: 'Free weekly group run starting at Bayfront Park. All paces welcome. Routes along Brickell, Edgewater, and the bay.',
          tags: ['running', 'free-event', 'community', 'outdoor', 'fitness-class'],
          price: 0,
        },
      ],
    },
    // @sunnysideupmarket - Sunday pop-up market (Miami / FLL area)
    {
      handle: 'sunnysideupmarket',
      name: 'Sunny Side Up Market',
      city: 'Fort Lauderdale',
      category: 'Community',
      knownEvents: [
        {
          name: 'Sunny Side Up Market',
          venue: 'Esplanade Park',
          address: '400 SW 2nd St, Fort Lauderdale, FL 33312',
          neighborhood: 'Riverwalk',
          lat: 26.1192,
          lng: -80.1478,
          schedule: 'weekly',
          days: [0], // Sunday
          time: '09:00',
          description: 'Weekly Sunday pop-up market in Fort Lauderdale with local vendors, artisan food, fresh produce, and handmade goods.',
          tags: ['market', 'outdoor', 'local-favorite', 'free-event', 'food'],
          price: 0,
        },
      ],
    },
    // @lauderdalerunclub - Run club Fort Lauderdale
    {
      handle: 'lauderdalerunclub',
      name: 'Lauderdale Run Club',
      city: 'Fort Lauderdale',
      category: 'Fitness',
      knownEvents: [
        {
          name: 'Lauderdale Run Club: Morning Run',
          venue: 'Las Olas Riverfront',
          address: '300 SW 1st Ave, Fort Lauderdale, FL 33301',
          neighborhood: 'Las Olas',
          lat: 26.1189,
          lng: -80.1456,
          schedule: 'weekly',
          days: [6], // Saturday
          time: '07:00',
          description: 'Free weekly group run through Fort Lauderdale. All paces welcome — from joggers to speedsters. Meet at Las Olas Riverfront.',
          tags: ['running', 'free-event', 'community', 'outdoor', 'fitness-class'],
          price: 0,
        },
        {
          name: 'Lauderdale Run Club: Weekday Run',
          venue: 'Holiday Park',
          address: '1601 NE 6th Ave, Fort Lauderdale, FL 33304',
          neighborhood: 'Victoria Park',
          lat: 26.1418,
          lng: -80.1248,
          schedule: 'weekly',
          days: [3], // Wednesday
          time: '06:30',
          description: 'Midweek morning group run through Fort Lauderdale neighborhoods. All levels welcome.',
          tags: ['running', 'free-event', 'community', 'outdoor'],
          price: 0,
        },
      ],
    },
    // @lauderale - Fort Lauderdale lifestyle / local events
    {
      handle: 'lauderale',
      name: 'Lauder Ale FTL',
      city: 'Fort Lauderdale',
      category: 'Community',
      knownEvents: [
        {
          name: 'Fort Lauderdale Weekend Bar Crawl',
          venue: 'Las Olas Boulevard',
          address: 'Las Olas Blvd, Fort Lauderdale, FL 33301',
          neighborhood: 'Las Olas',
          lat: 26.1195,
          lng: -80.1365,
          schedule: 'weekly',
          days: [6], // Saturday
          time: '20:00',
          description: 'Weekend bar crawl through the best bars and craft beer spots on Las Olas. Meet locals, discover hidden gems, enjoy FTL nightlife.',
          tags: ['craft-beer', 'nightlife', 'local-favorite', 'bar'],
          price: 0,
        },
      ],
    },
    // @thirdspacesmiami - Community event space Miami
    {
      handle: 'thirdspacesmiami',
      name: 'Third Spaces Miami',
      city: 'Miami',
      category: 'Community',
      knownEvents: [
        {
          name: 'Third Spaces: Community Gathering',
          venue: 'Third Spaces Miami',
          address: '1 NE 1st Ave, Miami, FL 33132',
          neighborhood: 'Downtown Miami',
          lat: 25.7743,
          lng: -80.1925,
          schedule: 'weekly',
          days: [5], // Friday
          time: '19:00',
          description: 'Weekly community gathering hosted by Third Spaces Miami. Art, music, conversation, and connection in a welcoming environment.',
          tags: ['community', 'local-favorite', 'pop-up'],
          price: 0,
        },
      ],
    },
    // @miamiconcours - Miami Concours classic car show
    {
      handle: 'miamiconcours',
      name: 'Miami Concours',
      city: 'Miami',
      category: 'Culture',
      knownEvents: [
        {
          name: 'Miami Concours: Classic Car Show',
          venue: 'The Biltmore Hotel',
          address: '1200 Anastasia Ave, Coral Gables, FL 33134',
          neighborhood: 'Coral Gables',
          lat: 25.7467,
          lng: -80.2792,
          schedule: 'monthly',
          time: '10:00',
          description: 'Curated classic and collector car gathering on the grounds of The Biltmore Hotel. Vintage autos, community, and Coral Gables grandeur.',
          tags: ['outdoor', 'local-favorite', 'community'],
          price: 0,
        },
      ],
    },
    // @miamijazzbooking - Jazz events across Miami
    {
      handle: 'miamijazzbooking',
      name: 'Miami Jazz Booking',
      city: 'Miami',
      category: 'Music',
      knownEvents: [
        {
          name: 'Miami Jazz Sessions',
          venue: 'Lagniappe House',
          address: '3425 NE 2nd Ave, Miami, FL 33137',
          neighborhood: 'Midtown',
          lat: 25.8089,
          lng: -80.1917,
          schedule: 'weekly',
          days: [4, 6], // Thu + Sat
          time: '21:00',
          description: 'Live jazz performances curated by Miami Jazz Booking. Local and touring jazz artists at intimate Miami venues.',
          tags: ['jazz', 'live-music', 'local-favorite', 'intimate'],
          price: 0,
        },
      ],
    },
    // @coffeeandchillmiami - Coffee + chill social events
    {
      handle: 'coffeeandchillmiami',
      name: 'Coffee and Chill Miami',
      city: 'Miami',
      category: 'Community',
      knownEvents: [
        {
          name: 'Coffee & Chill: Sunday Social',
          venue: 'Bayfront Park',
          address: '301 Biscayne Blvd, Miami, FL 33132',
          neighborhood: 'Downtown Miami',
          lat: 25.7733,
          lng: -80.1867,
          schedule: 'weekly',
          days: [0], // Sunday
          time: '09:00',
          description: 'Weekly Sunday morning coffee social at Bayfront Park. Great coffee, good people, and Biscayne Bay views.',
          tags: ['community', 'free-event', 'outdoor', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // @miamibloco - Afro-Brazilian drum & dance collective
    {
      handle: 'miamibloco',
      name: 'Miami Bloco',
      city: 'Miami',
      category: 'Music',
      knownEvents: [
        {
          name: 'Miami Bloco: Drum & Dance Practice',
          venue: 'Lummus Park',
          address: '1130 Ocean Dr, Miami Beach, FL 33139',
          neighborhood: 'South Beach',
          lat: 25.7826,
          lng: -80.1304,
          schedule: 'weekly',
          days: [0], // Sunday
          time: '15:00',
          description: 'Miami Bloco Afro-Brazilian drum and dance collective. Open rehearsal and street performance. All are welcome to watch or join.',
          tags: ['live-music', 'free-event', 'outdoor', 'community', 'local-favorite', 'beach'],
          price: 0,
        },
        {
          name: 'Miami Bloco: Street Parade',
          venue: 'Wynwood Arts District',
          address: 'NW 2nd Ave, Miami, FL 33127',
          neighborhood: 'Wynwood',
          lat: 25.8011,
          lng: -80.1996,
          schedule: 'monthly',
          time: '18:00',
          description: 'Monthly street parade through Wynwood with live Afro-Brazilian drumming, dancers, and community celebration.',
          tags: ['live-music', 'free-event', 'outdoor', 'community', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // @thestandardmiami - The Standard Miami Beach (Belle Isle, not South Beach)
    {
      handle: 'thestandardmiami',
      name: 'The Standard Miami',
      city: 'Miami',
      category: 'Wellness',
      knownEvents: [
        {
          name: 'The Standard: Weekend Pool Party',
          venue: 'The Standard Miami Beach',
          address: '40 Island Ave, Miami Beach, FL 33139',
          neighborhood: 'Miami Beach',
          lat: 25.7912,
          lng: -80.1567,
          schedule: 'weekly',
          days: [6, 0], // Sat-Sun
          time: '14:00',
          category: 'Nightlife',
          description: 'Weekend pool parties at The Standard Miami Beach. DJs, cocktails, and bay views from this iconic Belle Isle hotel. No rooftop — this is a legendary bayfront pool.',
          tags: ['dj', 'outdoor', 'waterfront', 'local-favorite', 'luxury'],
          price: 0,
        },
        {
          name: 'The Standard: Sunrise Yoga',
          venue: 'The Standard Miami Beach',
          address: '40 Island Ave, Miami Beach, FL 33139',
          neighborhood: 'Miami Beach',
          lat: 25.7912,
          lng: -80.1567,
          schedule: 'weekly',
          days: [6], // Saturday
          time: '08:00',
          description: 'Saturday morning yoga on the dock overlooking Biscayne Bay at The Standard. All levels welcome.',
          tags: ['yoga', 'wellness', 'waterfront', 'outdoor', 'sunrise'],
          price: 20,
        },
        {
          name: 'The Standard: Hammam & Spa Day',
          venue: 'The Standard Miami Beach',
          address: '40 Island Ave, Miami Beach, FL 33139',
          neighborhood: 'Miami Beach',
          lat: 25.7912,
          lng: -80.1567,
          schedule: 'weekly',
          days: [4, 5], // Thu-Fri
          time: '10:00',
          description: 'Day access to The Standard\'s hammam spa, hot tub, clawfoot tubs, and waterfront gardens on Belle Isle.',
          tags: ['wellness', 'waterfront', 'luxury', 'local-favorite'],
          price: 45,
        },
      ],
    },
    // @discodomingomiami - Sunday disco dance party
    {
      handle: 'discodomingomiami',
      name: 'Disco Domingo Miami',
      city: 'Miami',
      category: 'Nightlife',
      knownEvents: [
        {
          name: 'Disco Domingo',
          venue: 'Do Not Sit On The Furniture',
          address: '423 16th St, Miami Beach, FL 33139',
          neighborhood: 'South Beach',
          lat: 25.7893,
          lng: -80.1323,
          schedule: 'weekly',
          days: [0], // Sunday
          time: '22:00',
          description: 'The legendary Sunday disco night in Miami. Non-stop dance floor energy with classic disco, funk, and soul spinning until late.',
          tags: ['dj', 'nightlife', 'dancing', 'local-favorite'],
          price: 20,
        },
      ],
    },
    // @rawfigspopup - Raw Figs pop-up dining & market
    {
      handle: 'rawfigspopup',
      name: 'Raw Figs Pop-Up',
      city: 'Miami',
      category: 'Food & Drink',
      knownEvents: [
        {
          name: 'Raw Figs Pop-Up Market',
          venue: 'Wynwood Arts District',
          address: 'NW 2nd Ave, Miami, FL 33127',
          neighborhood: 'Wynwood',
          lat: 25.8011,
          lng: -80.1996,
          schedule: 'monthly',
          time: '12:00',
          description: 'Pop-up market featuring local makers, artisan food, vintage goods, and live music. Raw Figs brings together Miami\'s creative community.',
          tags: ['pop-up', 'food-market', 'local-favorite', 'outdoor'],
          price: 0,
        },
      ],
    },
    // @wynwood_marketplace - Wynwood arts & food market
    {
      handle: 'wynwood_marketplace',
      name: 'Wynwood Marketplace',
      city: 'Miami',
      category: 'Community',
      knownEvents: [
        {
          name: 'Wynwood Marketplace: Weekend Market',
          venue: 'Wynwood Marketplace',
          address: '2250 NW 2nd Ave, Miami, FL 33127',
          neighborhood: 'Wynwood',
          lat: 25.7980,
          lng: -80.1992,
          schedule: 'weekly',
          days: [5, 6, 0], // Fri-Sun
          time: '17:00',
          description: 'Open-air marketplace in the heart of Wynwood. Local artisans, street food, live music, and the best of Miami\'s creative scene.',
          tags: ['market', 'outdoor', 'local-favorite', 'live-music', 'food-market'],
          price: 0,
        },
      ],
    },
    // @wynwood_yoga - Outdoor yoga in Wynwood
    {
      handle: 'wynwood_yoga',
      name: 'Wynwood Yoga',
      city: 'Miami',
      category: 'Wellness',
      knownEvents: [
        {
          name: 'Wynwood Yoga: Outdoor Class',
          venue: 'Wynwood Walls Garden',
          address: '2520 NW 2nd Ave, Miami, FL 33127',
          neighborhood: 'Wynwood',
          lat: 25.8016,
          lng: -80.1992,
          schedule: 'weekly',
          days: [6, 0], // Sat-Sun
          time: '09:00',
          description: 'Outdoor yoga class in Wynwood surrounded by street art. All levels welcome — bring your own mat.',
          tags: ['yoga', 'wellness', 'outdoor', 'free-event', 'local-favorite'],
          price: 0,
        },
        {
          name: 'Wynwood Yoga: Weekday Flow',
          venue: 'Wynwood Walls Garden',
          address: '2520 NW 2nd Ave, Miami, FL 33127',
          neighborhood: 'Wynwood',
          lat: 25.8016,
          lng: -80.1992,
          schedule: 'weekly',
          days: [3], // Wednesday
          time: '07:00',
          description: 'Midweek morning yoga in Wynwood. Flow through poses with street art as your backdrop.',
          tags: ['yoga', 'wellness', 'outdoor', 'free-event'],
          price: 0,
        },
      ],
    },
    // @wynwoodmiami - Wynwood neighborhood events collective
    {
      handle: 'wynwoodmiami',
      name: 'Wynwood Miami',
      city: 'Miami',
      category: 'Art',
      knownEvents: [
        {
          name: 'Wynwood Second Saturday Art Walk',
          venue: 'Wynwood Arts District',
          address: 'NW 2nd Ave, Miami, FL 33127',
          neighborhood: 'Wynwood',
          lat: 25.8011,
          lng: -80.1996,
          schedule: 'monthly',
          time: '18:00',
          description: 'Wynwood\'s monthly art walk. Galleries open late, new exhibitions, street performances, and the neighborhood at its most alive.',
          tags: ['art-gallery', 'free-event', 'local-favorite', 'community'],
          price: 0,
        },
      ],
    },
    // @coffeeandbeatsofficial - Coffee + music social community
    {
      handle: 'coffeeandbeatsofficial',
      name: 'Coffee and Beats',
      city: 'Miami',
      category: 'Community',
      knownEvents: [
        {
          name: 'Coffee and Beats: Sunday Morning Session',
          venue: 'Wynwood Arts District',
          address: 'NW 2nd Ave, Miami, FL 33127',
          neighborhood: 'Wynwood',
          lat: 25.8011,
          lng: -80.1996,
          schedule: 'weekly',
          days: [0], // Sunday
          time: '10:00',
          description: 'Weekly Sunday morning community event: coffee, vinyl DJ sets, and good vibes. Free and open to all in the heart of Wynwood.',
          tags: ['dj', 'community', 'free-event', 'outdoor', 'local-favorite'],
          price: 0,
        },
      ],
    },
    // Soya e Pomodoro - Downtown Miami Italian brunch
    {
      handle: 'soyaepomodoro',
      name: 'Soya e Pomodoro',
      city: 'Miami',
      category: 'Food & Drink',
      knownEvents: [
        {
          name: 'Soya e Pomodoro: Weekend Brunch',
          venue: 'Soya e Pomodoro',
          address: '120 NE 1st St, Miami, FL 33132',
          neighborhood: 'Downtown Miami',
          lat: 25.7748,
          lng: -80.1929,
          schedule: 'weekly',
          days: [6, 0], // Sat-Sun
          time: '10:00',
          description: 'Beloved Italian brunch spot in Downtown Miami. Outdoor patio, fresh pasta, espresso, and Aperol spritzes in a cozy courtyard.',
          tags: ['brunch', 'outdoor', 'local-favorite'],
          price: 20,
        },
        {
          name: 'Soya e Pomodoro: Weekday Lunch',
          venue: 'Soya e Pomodoro',
          address: '120 NE 1st St, Miami, FL 33132',
          neighborhood: 'Downtown Miami',
          lat: 25.7748,
          lng: -80.1929,
          schedule: 'weekly',
          days: [1, 2, 3, 4, 5], // Mon-Fri
          time: '11:30',
          description: 'Casual Italian lunch at one of Downtown Miami\'s most beloved spots. Fresh pasta, salads, and paninis in a charming courtyard.',
          tags: ['outdoor', 'local-favorite'],
          price: 15,
        },
      ],
    },
  ];

  constructor() {
    super('Instagram Sources', { weight: 1.4, rateLimit: 0 });
  }

  async scrape(): Promise<RawEvent[]> {
    const events: RawEvent[] = [];
    const weeksAhead = 8;

    this.log(`Generating events from ${this.accounts.length} Instagram accounts...`);

    for (const account of this.accounts) {
      for (const event of account.knownEvents) {
        const generated = this.generateEventsFromTemplate(account, event, weeksAhead);
        events.push(...generated);
      }
    }

    this.log(`Generated ${events.length} events from Instagram sources`);
    return events;
  }

  private generateEventsFromTemplate(
    account: InstagramAccount,
    event: KnownEvent,
    weeksAhead: number
  ): RawEvent[] {
    const events: RawEvent[] = [];
    const today = new Date();

    switch (event.schedule) {
      case 'weekly':
        events.push(...this.generateWeeklyEvents(account, event, weeksAhead));
        break;
      case 'monthly':
        events.push(...this.generateMonthlyEvents(account, event, weeksAhead));
        break;
      case 'last-friday':
        events.push(...this.generateLastFridayEvents(account, event, weeksAhead));
        break;
    }

    return events;
  }

  private generateWeeklyEvents(
    account: InstagramAccount,
    event: KnownEvent,
    weeksAhead: number
  ): RawEvent[] {
    const events: RawEvent[] = [];
    const today = new Date();
    const daysToCheck = weeksAhead * 7;

    for (let i = 0; i < daysToCheck; i++) {
      const checkDate = addDays(today, i);
      const dayOfWeek = getDay(checkDate);

      if (event.days?.includes(dayOfWeek)) {
        events.push(this.createEvent(account, event, checkDate));
      }
    }

    return events;
  }

  private generateMonthlyEvents(
    account: InstagramAccount,
    event: KnownEvent,
    weeksAhead: number
  ): RawEvent[] {
    const events: RawEvent[] = [];
    const today = new Date();

    // Generate for next 3 months
    for (let month = 0; month < 3; month++) {
      const targetDate = addDays(today, month * 30);

      // First Friday/Saturday of the month
      const firstOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      let eventDate = firstOfMonth;

      // Find first Friday (5) or Saturday (6) depending on event
      const targetDay = event.name.toLowerCase().includes('friday') ? 5 : 6;
      while (getDay(eventDate) !== targetDay) {
        eventDate = addDays(eventDate, 1);
      }

      if (eventDate >= today) {
        events.push(this.createEvent(account, event, eventDate));
      }
    }

    return events;
  }

  private generateLastFridayEvents(
    account: InstagramAccount,
    event: KnownEvent,
    weeksAhead: number
  ): RawEvent[] {
    const events: RawEvent[] = [];
    const today = new Date();

    // Generate for next 3 months
    for (let month = 0; month < 3; month++) {
      const targetMonth = new Date(today.getFullYear(), today.getMonth() + month, 1);
      const lastDay = lastDayOfMonth(targetMonth);

      // Find last Friday of the month
      let eventDate = lastDay;
      while (getDay(eventDate) !== 5) {
        eventDate = addDays(eventDate, -1);
      }

      if (eventDate >= today) {
        events.push(this.createEvent(account, event, eventDate));
      }
    }

    return events;
  }

  private createEvent(account: InstagramAccount, event: KnownEvent, date: Date): RawEvent {
    const dateStr = format(date, 'yyyy-MM-dd');
    const startAt = `${dateStr}T${event.time}:00`;

    return {
      title: event.name,
      startAt,
      venueName: event.venue,
      address: event.address,
      neighborhood: event.neighborhood,
      lat: event.lat,
      lng: event.lng,
      city: account.city,
      tags: event.tags,
      category: event.category ?? account.category,
      priceLabel: event.price === 0 ? 'Free' : '$',
      priceAmount: event.price,
      isOutdoor: event.tags.includes('waterfront') || event.tags.includes('park') || event.tags.includes('cycling'),
      description: event.description,
      sourceUrl: `https://instagram.com/${account.handle}`,
      sourceName: `@${account.handle}`,
      recurring: true,
      recurrencePattern: event.schedule,
    };
  }

  /**
   * Get list of monitored Instagram accounts
   * Useful for manual event entry workflow
   */
  getMonitoredAccounts(): string[] {
    return this.accounts.map((a) => `@${a.handle}`);
  }
}
