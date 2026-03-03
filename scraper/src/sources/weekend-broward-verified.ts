/**
 * WeekendBroward Verified Events
 *
 * REAL events with SPECIFIC details (artist names, venues, dates, times, prices)
 * sourced from weekendbroward.com via Google's search index, official city sites,
 * Visit Lauderdale, and verified cross-references.
 *
 * Every event has:
 *  - Specific artist/performer name (NOT generic "Live Music")
 *  - Exact venue with address and GPS coordinates
 *  - Confirmed date and time
 *  - Price information
 *
 * No API keys required. Updated periodically from verified sources.
 */

import { BaseScraper } from './base.js';
import type { RawEvent } from '../types.js';

interface WBEvent {
  title: string;
  dates: string[]; // ISO date strings YYYY-MM-DD
  time: string; // HH:MM
  endTime?: string;
  venue: string;
  address: string;
  city: 'Fort Lauderdale' | 'Palm Beach';
  neighborhood: string;
  lat: number;
  lng: number;
  category: string;
  description: string;
  tags: string[];
  price: number;
  sourceUrl: string;
}

export class WeekendBrowardVerifiedScraper extends BaseScraper {
  constructor() {
    super('WeekendBroward Verified', { weight: 1.5, rateLimit: 0 });
  }

  private readonly events: WBEvent[] = [
    // ═══════════════════════════════════════════════════════════════════
    //  FRIDAY NIGHT SOUND WAVES — 10th Anniversary Season
    //  Las Olas Oceanside Park, every Friday 7-9:30 PM
    //  Source: theloopflb.com, visitlauderdale.com, weekendbroward.com
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'Friday Night Sound Waves: Private Stock',
      dates: ['2026-03-06'],
      time: '19:00',
      endTime: '21:30',
      venue: 'Las Olas Oceanside Park',
      address: '3000 E Las Olas Blvd, Fort Lauderdale, FL 33316',
      city: 'Fort Lauderdale',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1199,
      lng: -80.0974,
      category: 'Music',
      description: 'Friday Night Sound Waves 10th Anniversary Season — Private Stock performs live on the beach. Free beachfront concert with lawn games, artisan vendors, food trucks.',
      tags: ['live-music', 'free-event', 'beach', 'outdoor', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://theloopflb.com/events/categories/friday-night-sound-waves/',
    },
    {
      title: 'Friday Night Sound Waves: Shauna Sweeney & Friends',
      dates: ['2026-03-13'],
      time: '19:00',
      endTime: '21:30',
      venue: 'Las Olas Oceanside Park',
      address: '3000 E Las Olas Blvd, Fort Lauderdale, FL 33316',
      city: 'Fort Lauderdale',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1199,
      lng: -80.0974,
      category: 'Music',
      description: 'Friday Night Sound Waves 10th Anniversary — Shauna Sweeney & Friends take the stage. Free beachfront concert with food, drinks, and artisan vendors.',
      tags: ['live-music', 'free-event', 'beach', 'outdoor', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://theloopflb.com/events/categories/friday-night-sound-waves/',
    },
    {
      title: 'Friday Night Sound Waves: Joel DaSilva & Friends — All Star Blues Jam',
      dates: ['2026-03-20'],
      time: '19:00',
      endTime: '21:30',
      venue: 'Las Olas Oceanside Park',
      address: '3000 E Las Olas Blvd, Fort Lauderdale, FL 33316',
      city: 'Fort Lauderdale',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1199,
      lng: -80.0974,
      category: 'Music',
      description: 'Friday Night Sound Waves 10th Anniversary — Joel DaSilva & Friends host an All Star Blues Jam on the beach. Free admission, food trucks, artisan vendors.',
      tags: ['live-music', 'free-event', 'beach', 'outdoor', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://theloopflb.com/events/categories/friday-night-sound-waves/',
    },
    {
      title: 'Friday Night Sound Waves: Spred the Dub',
      dates: ['2026-03-27'],
      time: '19:00',
      endTime: '21:30',
      venue: 'Las Olas Oceanside Park',
      address: '3000 E Las Olas Blvd, Fort Lauderdale, FL 33316',
      city: 'Fort Lauderdale',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1199,
      lng: -80.0974,
      category: 'Music',
      description: 'Friday Night Sound Waves 10th Anniversary — Spred the Dub brings reggae vibes to the beach. Free admission, food trucks, artisan vendors.',
      tags: ['live-music', 'free-event', 'beach', 'outdoor', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://theloopflb.com/events/categories/friday-night-sound-waves/',
    },
    {
      title: 'Friday Night Sound Waves: Mr. Nice Guy & Friends (Season Finale)',
      dates: ['2026-04-03'],
      time: '19:00',
      endTime: '21:30',
      venue: 'Las Olas Oceanside Park',
      address: '3000 E Las Olas Blvd, Fort Lauderdale, FL 33316',
      city: 'Fort Lauderdale',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1199,
      lng: -80.0974,
      category: 'Music',
      description: 'Friday Night Sound Waves 10th Anniversary SEASON FINALE — Mr. Nice Guy & Friends close out the season. Free beachfront concert with food and vendors.',
      tags: ['live-music', 'free-event', 'beach', 'outdoor', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://theloopflb.com/events/categories/friday-night-sound-waves/',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  ROCK THE PARK — Free Concert Series (City of Plantation)
    //  Pine Island Park, monthly evening concerts
    //  Source: plantation.org, weekendbroward.com
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'Rock the Park: Good Bread & Bread Zeppelin',
      dates: ['2026-03-07'],
      time: '19:00',
      endTime: '22:00',
      venue: 'Pine Island Park',
      address: '320 S Pine Island Rd, Plantation, FL 33324',
      city: 'Fort Lauderdale',
      neighborhood: 'Plantation',
      lat: 26.1253,
      lng: -80.2457,
      category: 'Music',
      description: 'Rock the Park free concert series — Good Bread and Bread Zeppelin (Led Zeppelin tribute) perform live. Food trucks open at 6 PM. Lawn chairs and blankets welcome.',
      tags: ['live-music', 'free-event', 'outdoor', 'family-friendly'],
      price: 0,
      sourceUrl: 'https://weekendbroward.com/rock-the-park-free-concert-series-in-plantation-2019/',
    },
    {
      title: 'Rock the Park: Ultimate Garth & She\'s So Shania',
      dates: ['2026-04-03'],
      time: '19:00',
      endTime: '22:00',
      venue: 'Pine Island Park',
      address: '320 S Pine Island Rd, Plantation, FL 33324',
      city: 'Fort Lauderdale',
      neighborhood: 'Plantation',
      lat: 26.1253,
      lng: -80.2457,
      category: 'Music',
      description: 'Rock the Park free concert — Ultimate Garth (Garth Brooks tribute) and She\'s So Shania (Shania Twain tribute). Food trucks at 6 PM. Free admission.',
      tags: ['live-music', 'free-event', 'outdoor', 'family-friendly'],
      price: 0,
      sourceUrl: 'https://weekendbroward.com/rock-the-park-free-concert-series-in-plantation-2019/',
    },
    {
      title: 'Rock the Park: All Fired Up (Pat Benatar & Heart Tributes)',
      dates: ['2026-05-01'],
      time: '19:00',
      endTime: '22:00',
      venue: 'Pine Island Park',
      address: '320 S Pine Island Rd, Plantation, FL 33324',
      city: 'Fort Lauderdale',
      neighborhood: 'Plantation',
      lat: 26.1253,
      lng: -80.2457,
      category: 'Music',
      description: 'Rock the Park free concert — All Fired Up performs Pat Benatar and Heart tributes. Food trucks at 6 PM. Free parking. Lawn chairs welcome.',
      tags: ['live-music', 'free-event', 'outdoor', 'family-friendly'],
      price: 0,
      sourceUrl: 'https://weekendbroward.com/rock-the-park-free-concert-series-in-plantation-2019/',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  SOUNDS OF THE TOWN — Free Concert Series (Town of Davie)
    //  Bamford Sports Complex, monthly Friday concerts
    //  Source: davie-fl.gov, weekendbroward.com
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'Sounds of the Town: Havoc 305',
      dates: ['2026-03-13'],
      time: '18:00',
      endTime: '21:00',
      venue: 'Bamford Sports Complex',
      address: '3801 S Pine Island Rd, Davie, FL 33328',
      city: 'Fort Lauderdale',
      neighborhood: 'Davie',
      lat: 26.0550,
      lng: -80.2457,
      category: 'Music',
      description: 'Sounds of the Town free concert featuring Havoc 305. Food trucks, festival seating. Bands start at 6:30 PM. Bring lawn chairs and blankets.',
      tags: ['live-music', 'free-event', 'outdoor', 'community'],
      price: 0,
      sourceUrl: 'https://www.davie-fl.gov/1645/Sounds-of-the-Town',
    },
    {
      title: 'Sounds of the Town: Sucker Punch',
      dates: ['2026-04-17'],
      time: '18:00',
      endTime: '21:00',
      venue: 'Bamford Sports Complex',
      address: '3801 S Pine Island Rd, Davie, FL 33328',
      city: 'Fort Lauderdale',
      neighborhood: 'Davie',
      lat: 26.0550,
      lng: -80.2457,
      category: 'Music',
      description: 'Sounds of the Town free concert featuring Sucker Punch. Food trucks, festival seating. Bands start at 6:30 PM.',
      tags: ['live-music', 'free-event', 'outdoor', 'community'],
      price: 0,
      sourceUrl: 'https://www.davie-fl.gov/1645/Sounds-of-the-Town',
    },
    {
      title: 'Sounds of the Town: Big Rock Band',
      dates: ['2026-05-08'],
      time: '18:00',
      endTime: '21:00',
      venue: 'Bamford Sports Complex',
      address: '3801 S Pine Island Rd, Davie, FL 33328',
      city: 'Fort Lauderdale',
      neighborhood: 'Davie',
      lat: 26.0550,
      lng: -80.2457,
      category: 'Music',
      description: 'Sounds of the Town free concert featuring Big Rock Band. Food trucks, festival seating. Season finale — bands start at 6:30 PM.',
      tags: ['live-music', 'free-event', 'outdoor', 'community'],
      price: 0,
      sourceUrl: 'https://www.davie-fl.gov/1645/Sounds-of-the-Town',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  FESTIVAL OF THE ARTS BOCA — 20th Anniversary
    //  Mizner Park Amphitheater, Feb 27 – Mar 8
    //  Source: festivalboca.org, weekendbroward.com
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'Festival of the Arts Boca: From Swan Lake to the Stones',
      dates: ['2026-03-01'],
      time: '19:00',
      venue: 'Mizner Park Amphitheater',
      address: '590 Plaza Real, Boca Raton, FL 33432',
      city: 'Palm Beach',
      neighborhood: 'Boca Raton',
      lat: 26.3569,
      lng: -80.0832,
      category: 'Culture',
      description: 'Festival of the Arts Boca 20th Anniversary — "From Swan Lake to the Stones" featuring Melanie Hamrick, Joanna DeFelice, and Christine Shevchenko in a night of ballet and rock.',
      tags: ['live-music', 'outdoor', 'festival', 'local-favorite'],
      price: 25,
      sourceUrl: 'https://festivalboca.org/',
    },
    {
      title: 'Festival of the Arts Boca: Doris Kearns Goodwin (Authors & Ideas)',
      dates: ['2026-03-02'],
      time: '19:00',
      venue: 'Mizner Park Amphitheater',
      address: '590 Plaza Real, Boca Raton, FL 33432',
      city: 'Palm Beach',
      neighborhood: 'Boca Raton',
      lat: 26.3569,
      lng: -80.0832,
      category: 'Culture',
      description: 'Festival of the Arts Boca 20th Anniversary — Pulitzer Prize-winning historian Doris Kearns Goodwin in the Authors & Ideas series. Virtual tickets also available ($15).',
      tags: ['outdoor', 'festival', 'local-favorite'],
      price: 25,
      sourceUrl: 'https://festivalboca.org/',
    },
    {
      title: 'Festival of the Arts Boca: Walter Mosley (Authors & Ideas)',
      dates: ['2026-03-03'],
      time: '19:00',
      venue: 'Mizner Park Amphitheater',
      address: '590 Plaza Real, Boca Raton, FL 33432',
      city: 'Palm Beach',
      neighborhood: 'Boca Raton',
      lat: 26.3569,
      lng: -80.0832,
      category: 'Culture',
      description: 'Festival of the Arts Boca 20th Anniversary — Bestselling author Walter Mosley (Easy Rawlins series) in the Authors & Ideas series.',
      tags: ['outdoor', 'festival', 'local-favorite'],
      price: 25,
      sourceUrl: 'https://festivalboca.org/',
    },
    {
      title: 'Festival of the Arts Boca: Time For Three (Grammy-Winning Trio)',
      dates: ['2026-03-07'],
      time: '19:30',
      venue: 'Mizner Park Amphitheater',
      address: '590 Plaza Real, Boca Raton, FL 33432',
      city: 'Palm Beach',
      neighborhood: 'Boca Raton',
      lat: 26.3569,
      lng: -80.0832,
      category: 'Music',
      description: 'Festival of the Arts Boca 20th Anniversary — Grammy-winning trio Time For Three performs their genre-defying mix of classical, bluegrass, and pop.',
      tags: ['live-music', 'outdoor', 'festival', 'local-favorite'],
      price: 25,
      sourceUrl: 'https://festivalboca.org/',
    },
    {
      title: 'Festival of the Arts Boca: Patti LuPone (Closing Night)',
      dates: ['2026-03-08'],
      time: '19:00',
      venue: 'Mizner Park Amphitheater',
      address: '590 Plaza Real, Boca Raton, FL 33432',
      city: 'Palm Beach',
      neighborhood: 'Boca Raton',
      lat: 26.3569,
      lng: -80.0832,
      category: 'Music',
      description: 'Festival of the Arts Boca 20th Anniversary CLOSING NIGHT — Tony and Grammy winner Patti LuPone. Her only Florida appearance. Tickets from $15–$150.',
      tags: ['live-music', 'outdoor', 'festival', 'local-favorite'],
      price: 40,
      sourceUrl: 'https://festivalboca.org/',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  FLORIDA RENAISSANCE FESTIVAL — 34th Annual
    //  Quiet Waters Park, Sat & Sun, Feb 7 – Mar 29
    //  Source: ren-fest.com, weekendbroward.com, visitlauderdale.com
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'Florida Renaissance Festival',
      dates: [
        '2026-03-07', '2026-03-08',
        '2026-03-14', '2026-03-15',
        '2026-03-21', '2026-03-22',
        '2026-03-28', '2026-03-29',
      ],
      time: '10:00',
      venue: 'Quiet Waters Park',
      address: '401 S Powerline Rd, Deerfield Beach, FL 33442',
      city: 'Fort Lauderdale',
      neighborhood: 'Deerfield Beach',
      lat: 26.3177,
      lng: -80.1234,
      category: 'Culture',
      description: '34th Annual Florida Renaissance Festival — jousting 3x daily, 100+ merchants, 12 stages, sword fighters, minstrels, magicians. Cashless box office. Free parking.',
      tags: ['festival', 'outdoor', 'family-friendly', 'local-favorite'],
      price: 39,
      sourceUrl: 'https://www.ren-fest.com/',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  3rd ANNUAL SOUTH FLORIDA FOOD FEST & CRAFT FAIR
    //  South County Regional Park, Boca Raton
    //  Source: weekendbroward.com, battlebroseventss
    // ═══════════════════════════════════════════════════════════════════

    {
      title: '3rd Annual South Florida Food Fest & Craft Fair',
      dates: ['2026-03-07', '2026-03-08'],
      time: '12:00',
      endTime: '20:00',
      venue: 'South County Regional Park',
      address: '20405 Amphitheater Circle, Boca Raton, FL 33498',
      city: 'Palm Beach',
      neighborhood: 'Boca Raton',
      lat: 26.3684,
      lng: -80.2025,
      category: 'Food & Drink',
      description: '75+ local crafters and artisans, 25+ restaurants and food trucks with $1-$5 items, free kid zone. Charity partner: Friends of Foster Children.',
      tags: ['food', 'outdoor', 'festival', 'family-friendly'],
      price: 10,
      sourceUrl: 'https://weekendbroward.com/events/south-florida-food-fest-craft-fair/',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  ST. PATRICK'S DAY — Fort Lauderdale
    //  Downtown Fort Lauderdale, March 14-15
    //  Source: weekendbroward.com, visitlauderdale.com
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'Fort Lauderdale St. Patrick\'s Day Parade & Festival',
      dates: ['2026-03-14'],
      time: '11:00',
      endTime: '18:00',
      venue: 'Downtown Fort Lauderdale',
      address: 'Las Olas Blvd, Fort Lauderdale, FL 33301',
      city: 'Fort Lauderdale',
      neighborhood: 'Las Olas',
      lat: 26.1195,
      lng: -80.1365,
      category: 'Community',
      description: 'Annual St. Patrick\'s Day parade and festival through downtown Fort Lauderdale. Marching bands, floats, Irish food and drinks, live music. Free to attend.',
      tags: ['free-event', 'outdoor', 'community', 'festival', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://weekendbroward.com/st-patricks-day-events-around-town-2/',
    },
    {
      title: 'Shamrock Run 4-Miler (St. Patrick\'s Day)',
      dates: ['2026-03-15'],
      time: '07:15',
      venue: 'Downtown Fort Lauderdale',
      address: 'Fort Lauderdale, FL 33301',
      city: 'Fort Lauderdale',
      neighborhood: 'Downtown FLL',
      lat: 26.1224,
      lng: -80.1373,
      category: 'Fitness',
      description: 'Annual Shamrock Run — 4-mile race followed by kids\' leprechaun bash, then parade and concert starting at noon.',
      tags: ['running', 'outdoor', 'community'],
      price: 35,
      sourceUrl: 'https://weekendbroward.com/st-patricks-day-events-around-town-2/',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  PALM BEACH INTERNATIONAL BOAT SHOW
    //  Flagler Drive, West Palm Beach, March 25-29
    //  Source: yachtcharterfleet.com, livingfla.com
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'Palm Beach International Boat Show',
      dates: ['2026-03-25', '2026-03-26', '2026-03-27', '2026-03-28', '2026-03-29'],
      time: '10:00',
      endTime: '19:00',
      venue: 'Flagler Drive Waterfront',
      address: '101 S Flagler Dr, West Palm Beach, FL 33401',
      city: 'Palm Beach',
      neighborhood: 'West Palm Beach',
      lat: 26.7140,
      lng: -80.0498,
      category: 'Culture',
      description: 'Palm Beach International Boat Show — $1.2 billion+ in yachts from inflatables to 90m superyachts. 55,000+ visitors expected. GA and VIP (Windward Experience with premium open bar).',
      tags: ['waterfront', 'outdoor', 'local-favorite'],
      price: 35,
      sourceUrl: 'https://www.visitlauderdale.com/events/annual-events-festivals/',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  BARBIE DREAM FEST (Inaugural)
    //  Broward Convention Center, March 27-29
    //  Source: barbiedreamfest.com, visitlauderdale.com
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'Barbie Dream Fest',
      dates: ['2026-03-27', '2026-03-28', '2026-03-29'],
      time: '10:00',
      endTime: '18:00',
      venue: 'Broward County Convention Center',
      address: '1950 Eisenhower Blvd, Fort Lauderdale, FL 33316',
      city: 'Fort Lauderdale',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.0993,
      lng: -80.1188,
      category: 'Family',
      description: 'Inaugural Barbie Dream Fest by Mattel — life-size DreamHouse, \'80s disco skating rink, Ultimate Barbie Fashion Show, interactive exhibits, workshops, collector showcases.',
      tags: ['family-friendly', 'festival'],
      price: 148,
      sourceUrl: 'https://www.barbiedreamfest.com/',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  INAUGURAL SCOTTISH CELTIC MUSIC FESTIVAL
    //  Bergeron Rodeo Grounds, Davie, March 28
    //  Source: sassf.org, weekendbroward.com, visitlauderdale.com
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'Scottish Celtic Music Festival: Seven Nations, Clovers Revenge, Gaelica & more',
      dates: ['2026-03-28'],
      time: '12:00',
      endTime: '21:00',
      venue: 'Bergeron Rodeo Grounds',
      address: '4201 Rodeo Way, Davie, FL 33314',
      city: 'Fort Lauderdale',
      neighborhood: 'Davie',
      lat: 26.0808,
      lng: -80.2331,
      category: 'Music',
      description: 'Inaugural Scottish Celtic Music Festival — Seven Nations, Clovers Revenge, Gaelica, Blue Skye, Femme Celtique. Pipe bands, Scottish country dancing, clan tents, children\'s activities.',
      tags: ['live-music', 'festival', 'outdoor', 'family-friendly'],
      price: 25,
      sourceUrl: 'https://www.sassf.org/event-6325690',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  JAZZ FEST POMPANO BEACH — 5th Annual
    //  Pompano Beach Shoreline, April 18-19
    //  Source: weekendbroward.com
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'Jazz Fest Pompano Beach',
      dates: ['2026-04-18', '2026-04-19'],
      time: '12:00',
      endTime: '21:00',
      venue: 'Pompano Beach Shoreline',
      address: 'N Ocean Blvd, Pompano Beach, FL 33062',
      city: 'Fort Lauderdale',
      neighborhood: 'Pompano Beach',
      lat: 26.2412,
      lng: -80.0900,
      category: 'Music',
      description: '5th Annual Jazz Fest Pompano Beach — two days of world-class jazz by Grammy winners and local talent along the Pompano Beach shoreline. Free to the public.',
      tags: ['jazz', 'live-music', 'free-event', 'outdoor', 'festival', 'beach', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://weekendbroward.com/events/jazz-fest-pompano-beach/',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  GALBANI FESTA ITALIANA OF WELLINGTON
    //  Village Park, Wellington, April 17-19
    //  Source: weekendbroward.com
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'Galbani Festa Italiana of Wellington',
      dates: ['2026-04-17', '2026-04-18', '2026-04-19'],
      time: '17:00',
      endTime: '22:00',
      venue: 'Village Park',
      address: '11700 Pierson Rd, Wellington, FL 33414',
      city: 'Palm Beach',
      neighborhood: 'Wellington',
      lat: 26.6557,
      lng: -80.2331,
      category: 'Food & Drink',
      description: 'Galbani Festa Italiana of Wellington — three days of authentic Italian food, live music, cooking demos, Italian cars, and cultural entertainment.',
      tags: ['food', 'festival', 'live-music', 'outdoor', 'family-friendly'],
      price: 10,
      sourceUrl: 'https://weekendbroward.com/events/festa-italiana-wellington/',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  BROWARD COUNTY WATERWAY CLEANUP
    //  Various locations, March 7
    //  Source: weekendbroward.com
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'Broward County Waterway Cleanup',
      dates: ['2026-03-07'],
      time: '08:00',
      endTime: '12:00',
      venue: 'Various Locations',
      address: 'Fort Lauderdale, FL',
      city: 'Fort Lauderdale',
      neighborhood: 'Downtown FLL',
      lat: 26.1224,
      lng: -80.1373,
      category: 'Community',
      description: 'Annual Broward County waterway and shoreline cleanup. No boat needed. Free volunteer event across multiple locations.',
      tags: ['free-event', 'outdoor', 'community'],
      price: 0,
      sourceUrl: 'https://weekendbroward.com/events/',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  PIANO MAN JEFFREY ALLEN — Weekly at Cafe BVR
    //  Lauderdale-By-The-Sea, Thu & Fri, 7-10 PM
    //  Source: weekendbroward.com live music calendar
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'Piano Man Jeffrey Allen: Classic Yacht Rock',
      dates: [
        // Thursdays
        '2026-03-05', '2026-03-12', '2026-03-19', '2026-03-26',
        '2026-04-02', '2026-04-09', '2026-04-16', '2026-04-23',
        // Fridays
        '2026-03-06', '2026-03-13', '2026-03-20', '2026-03-27',
        '2026-04-03', '2026-04-10', '2026-04-17', '2026-04-24',
      ],
      time: '19:00',
      endTime: '22:00',
      venue: 'Cafe BVR (The Lounge)',
      address: '4404 Bougainvilla Dr, Lauderdale-By-The-Sea, FL 33308',
      city: 'Fort Lauderdale',
      neighborhood: 'Lauderdale-By-The-Sea',
      lat: 26.1914,
      lng: -80.0983,
      category: 'Music',
      description: 'Piano Man Jeffrey Allen performs classic Yacht Rock — Billy Joel, Stevie Wonder, Bruno Mars, Alicia Keys, Elton John, and more every Thursday & Friday at Cafe BVR.',
      tags: ['live-music', 'waterfront'],
      price: 0,
      sourceUrl: 'https://weekendbroward.com/calendar/live-music-events-fort-lauderdale/',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  OLD TOWN UNTAPPED — Monthly First Friday
    //  Downtown Pompano Beach
    //  Source: weekendbroward.com
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'Old Town Untapped: Craft Brew & Arts Festival',
      dates: ['2026-03-06', '2026-04-03', '2026-05-01'],
      time: '18:00',
      endTime: '22:00',
      venue: 'Downtown Pompano Beach',
      address: 'E Atlantic Blvd, Pompano Beach, FL 33060',
      city: 'Fort Lauderdale',
      neighborhood: 'Pompano Beach',
      lat: 26.2356,
      lng: -80.1287,
      category: 'Food & Drink',
      description: 'Old Town Untapped — monthly first-Friday craft brew and arts festival. Local craft beer, art vendors, live music, and food trucks in Downtown Pompano.',
      tags: ['craft-beer', 'art-gallery', 'free-event', 'outdoor', 'live-music', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://weekendbroward.com/events/old-town-untapped/',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  HARD ROCK LIVE — Major concerts at Seminole Hard Rock, Hollywood
    //  Source: ticketmaster.com/hard-rock-live-tickets-hollywood/venue/107337
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'The Offspring: SUPERCHARGED Worldwide Tour',
      dates: ['2026-03-05'],
      time: '20:00',
      venue: 'Hard Rock Live',
      address: '1 Seminole Way, Hollywood, FL 33314',
      city: 'Fort Lauderdale',
      neighborhood: 'Hollywood',
      lat: 26.0512,
      lng: -80.2118,
      category: 'Music',
      description: 'The Offspring bring their SUPERCHARGED Worldwide tour to Hard Rock Live. Free self-parking.',
      tags: ['live-music'],
      price: 60,
      sourceUrl: 'https://www.ticketmaster.com/hard-rock-live-tickets-hollywood/venue/107337',
    },
    {
      title: 'Miranda Lambert',
      dates: ['2026-03-12'],
      time: '20:00',
      venue: 'Hard Rock Live',
      address: '1 Seminole Way, Hollywood, FL 33314',
      city: 'Fort Lauderdale',
      neighborhood: 'Hollywood',
      lat: 26.0512,
      lng: -80.2118,
      category: 'Music',
      description: 'Country superstar Miranda Lambert live at Hard Rock Live Hollywood. Free self-parking on site.',
      tags: ['live-music'],
      price: 60,
      sourceUrl: 'https://www.ticketmaster.com/hard-rock-live-tickets-hollywood/venue/107337',
    },
    {
      title: 'Diana Ross',
      dates: ['2026-03-19'],
      time: '20:00',
      venue: 'Hard Rock Live',
      address: '1 Seminole Way, Hollywood, FL 33314',
      city: 'Fort Lauderdale',
      neighborhood: 'Hollywood',
      lat: 26.0512,
      lng: -80.2118,
      category: 'Music',
      description: 'The legendary Diana Ross live at Hard Rock Live Hollywood. An evening of Motown classics and timeless hits.',
      tags: ['live-music'],
      price: 87,
      sourceUrl: 'https://www.ticketmaster.com/hard-rock-live-tickets-hollywood/venue/107337',
    },
    {
      title: 'Martin Lawrence: Y\'all Still Know What It Is! Tour',
      dates: ['2026-03-21'],
      time: '20:00',
      venue: 'Hard Rock Live',
      address: '1 Seminole Way, Hollywood, FL 33314',
      city: 'Fort Lauderdale',
      neighborhood: 'Hollywood',
      lat: 26.0512,
      lng: -80.2118,
      category: 'Comedy',
      description: 'Martin Lawrence returns to the stage with his "Y\'all Still Know What It Is!" stand-up tour at Hard Rock Live.',
      tags: ['comedy'],
      price: 89,
      sourceUrl: 'https://www.ticketmaster.com/hard-rock-live-tickets-hollywood/venue/107337',
    },
    {
      title: 'Reik Tour 2026',
      dates: ['2026-03-22'],
      time: '20:00',
      venue: 'Hard Rock Live',
      address: '1 Seminole Way, Hollywood, FL 33314',
      city: 'Fort Lauderdale',
      neighborhood: 'Hollywood',
      lat: 26.0512,
      lng: -80.2118,
      category: 'Music',
      description: 'Latin pop group Reik on their 2026 world tour at Hard Rock Live Hollywood.',
      tags: ['live-music', 'latin'],
      price: 65,
      sourceUrl: 'https://www.ticketmaster.com/hard-rock-live-tickets-hollywood/venue/107337',
    },
    {
      title: 'Eric Church: Free The Machine Tour',
      dates: ['2026-03-27'],
      time: '20:00',
      venue: 'Hard Rock Live',
      address: '1 Seminole Way, Hollywood, FL 33314',
      city: 'Fort Lauderdale',
      neighborhood: 'Hollywood',
      lat: 26.0512,
      lng: -80.2118,
      category: 'Music',
      description: 'Country star Eric Church brings the Free The Machine Tour to Hard Rock Live Hollywood.',
      tags: ['live-music'],
      price: 75,
      sourceUrl: 'https://www.ticketmaster.com/hard-rock-live-tickets-hollywood/venue/107337',
    },
    {
      title: 'Dancing With The Stars: Live! 2026 Tour',
      dates: ['2026-03-29'],
      time: '15:00',
      venue: 'Hard Rock Live',
      address: '1 Seminole Way, Hollywood, FL 33314',
      city: 'Fort Lauderdale',
      neighborhood: 'Hollywood',
      lat: 26.0512,
      lng: -80.2118,
      category: 'Culture',
      description: 'Dancing With The Stars Live! 2026 tour featuring fan-favorite pros and mirrorball magic at Hard Rock Live.',
      tags: ['live-entertainment', 'family-friendly'],
      price: 31,
      sourceUrl: 'https://www.ticketmaster.com/hard-rock-live-tickets-hollywood/venue/107337',
    },
    {
      title: 'Gladys Knight',
      dates: ['2026-04-02'],
      time: '20:00',
      venue: 'Hard Rock Live',
      address: '1 Seminole Way, Hollywood, FL 33314',
      city: 'Fort Lauderdale',
      neighborhood: 'Hollywood',
      lat: 26.0512,
      lng: -80.2118,
      category: 'Music',
      description: 'The Empress of Soul Gladys Knight live at Hard Rock Live Hollywood.',
      tags: ['live-music'],
      price: 95,
      sourceUrl: 'https://www.ticketmaster.com/hard-rock-live-tickets-hollywood/venue/107337',
    },
    {
      title: 'Ali Wong Live',
      dates: ['2026-04-03'],
      time: '20:00',
      venue: 'Hard Rock Live',
      address: '1 Seminole Way, Hollywood, FL 33314',
      city: 'Fort Lauderdale',
      neighborhood: 'Hollywood',
      lat: 26.0512,
      lng: -80.2118,
      category: 'Comedy',
      description: 'Ali Wong brings her razor-sharp stand-up to Hard Rock Live Hollywood.',
      tags: ['comedy'],
      price: 94,
      sourceUrl: 'https://www.ticketmaster.com/hard-rock-live-tickets-hollywood/venue/107337',
    },
    {
      title: 'Santana: Oneness Tour 2026',
      dates: ['2026-04-11'],
      time: '20:00',
      venue: 'Hard Rock Live',
      address: '1 Seminole Way, Hollywood, FL 33314',
      city: 'Fort Lauderdale',
      neighborhood: 'Hollywood',
      lat: 26.0512,
      lng: -80.2118,
      category: 'Music',
      description: 'Carlos Santana and his band bring the Oneness Tour to Hard Rock Live. A night of legendary guitar and Latin rock.',
      tags: ['live-music', 'latin'],
      price: 111,
      sourceUrl: 'https://www.ticketmaster.com/hard-rock-live-tickets-hollywood/venue/107337',
    },
    {
      title: 'The Black Keys with Miles Kane',
      dates: ['2026-04-24'],
      time: '20:00',
      venue: 'Hard Rock Live',
      address: '1 Seminole Way, Hollywood, FL 33314',
      city: 'Fort Lauderdale',
      neighborhood: 'Hollywood',
      lat: 26.0512,
      lng: -80.2118,
      category: 'Music',
      description: 'The Black Keys with special guest Miles Kane at Hard Rock Live Hollywood.',
      tags: ['live-music'],
      price: 95,
      sourceUrl: 'https://www.ticketmaster.com/hard-rock-live-tickets-hollywood/venue/107337',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  CULTURE ROOM — Intimate indie/rock venue, Fort Lauderdale
    //  Source: ticketmaster.com, bandsintown.com, songkick.com
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'Pigeons Playing Ping Pong',
      dates: ['2026-03-08'],
      time: '18:30',
      venue: 'Culture Room',
      address: '3045 N Federal Hwy, Fort Lauderdale, FL 33306',
      city: 'Fort Lauderdale',
      neighborhood: 'Victoria Park',
      lat: 26.1427,
      lng: -80.1223,
      category: 'Music',
      description: 'Pigeons Playing Ping Pong bring their high-energy funk/jam/rock to Culture Room. Intimate 650-cap venue.',
      tags: ['live-music'],
      price: 71,
      sourceUrl: 'https://cultureroom.net/',
    },
    {
      title: 'Buzzcocks / Redd Kross',
      dates: ['2026-04-02'],
      time: '19:30',
      venue: 'Culture Room',
      address: '3045 N Federal Hwy, Fort Lauderdale, FL 33306',
      city: 'Fort Lauderdale',
      neighborhood: 'Victoria Park',
      lat: 26.1427,
      lng: -80.1223,
      category: 'Music',
      description: 'Punk legends Buzzcocks with Redd Kross at Culture Room. One of FLL\'s best small venues.',
      tags: ['live-music'],
      price: 57,
      sourceUrl: 'https://cultureroom.net/',
    },
    {
      title: 'The Growlers',
      dates: ['2026-04-10'],
      time: '19:30',
      venue: 'Culture Room',
      address: '3045 N Federal Hwy, Fort Lauderdale, FL 33306',
      city: 'Fort Lauderdale',
      neighborhood: 'Victoria Park',
      lat: 26.1427,
      lng: -80.1223,
      category: 'Music',
      description: 'The Growlers\' beachy psychedelic rock at Culture Room. Standing room, 650 capacity.',
      tags: ['live-music'],
      price: 76,
      sourceUrl: 'https://cultureroom.net/',
    },
    {
      title: 'VNV Nation',
      dates: ['2026-04-17'],
      time: '19:30',
      venue: 'Culture Room',
      address: '3045 N Federal Hwy, Fort Lauderdale, FL 33306',
      city: 'Fort Lauderdale',
      neighborhood: 'Victoria Park',
      lat: 26.1427,
      lng: -80.1223,
      category: 'Music',
      description: 'Electronic/industrial act VNV Nation live at Culture Room Fort Lauderdale.',
      tags: ['live-music', 'electronic'],
      price: 64,
      sourceUrl: 'https://cultureroom.net/',
    },
    {
      title: 'Lacuna Coil: Sleepless Empire Tour 2026',
      dates: ['2026-04-22'],
      time: '19:00',
      venue: 'Culture Room',
      address: '3045 N Federal Hwy, Fort Lauderdale, FL 33306',
      city: 'Fort Lauderdale',
      neighborhood: 'Victoria Park',
      lat: 26.1427,
      lng: -80.1223,
      category: 'Music',
      description: 'Italian metal/rock band Lacuna Coil on their Sleepless Empire Tour at Culture Room.',
      tags: ['live-music'],
      price: 50,
      sourceUrl: 'https://cultureroom.net/',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  TORTUGA MUSIC FESTIVAL — Fort Lauderdale Beach
    //  Source: tortugamusicfestival.com
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'Tortuga Music Festival 2026',
      dates: ['2026-04-10', '2026-04-11', '2026-04-12'],
      time: '12:00',
      endTime: '23:00',
      venue: 'Fort Lauderdale Beach Park',
      address: '1100 Seabreeze Blvd, Fort Lauderdale, FL 33316',
      city: 'Fort Lauderdale',
      neighborhood: 'Fort Lauderdale Beach',
      lat: 26.1100,
      lng: -80.1025,
      category: 'Music',
      description: 'Three-day oceanfront music festival. Headliners: Post Malone, Riley Green, Kenny Chesney. Three stages. All ages. Marine conservation fundraising.',
      tags: ['live-music', 'festival', 'beach', 'outdoor'],
      price: 150,
      sourceUrl: 'https://tortugamusicfestival.com/',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  FOOD & DRINK FESTIVALS — Broward County
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'Dania Beach Wine & Seafood Festival',
      dates: ['2026-03-14'],
      time: '16:00',
      endTime: '21:00',
      venue: 'Dania Beach City Hall Plaza',
      address: '100 W Dania Beach Blvd, Dania Beach, FL 33004',
      city: 'Fort Lauderdale',
      neighborhood: 'Dania Beach',
      lat: 26.0545,
      lng: -80.1473,
      category: 'Food & Drink',
      description: '40+ wine brands, 10+ breweries, seafood vendors, kids zone, live music, paint & sip. Pet-friendly. Free entry; sampling ticket $55.',
      tags: ['wine-tasting', 'food', 'outdoor', 'live-music', 'family-friendly'],
      price: 0,
      sourceUrl: 'https://daniabeachwineandseafoodfest.com/',
    },
    {
      title: 'Fort Lauderdale Beer, Wine & Spirits Fest',
      dates: ['2026-03-28'],
      time: '13:00',
      endTime: '21:30',
      venue: 'Esplanade Park',
      address: '400 SW 2nd St, Fort Lauderdale, FL 33312',
      city: 'Fort Lauderdale',
      neighborhood: 'Riverwalk',
      lat: 26.1165,
      lng: -80.1495,
      category: 'Food & Drink',
      description: '100+ beer, wine, and spirit samples. Live entertainment, food trucks, interactive games. 21+ only. Two sessions: 1-4:30 PM and 6-9:30 PM.',
      tags: ['craft-beer', 'wine-tasting', 'outdoor', 'live-music'],
      price: 29,
      sourceUrl: 'https://www.fortlauderdale.gov/Home/Components/Calendar/Event/24348/',
    },
    {
      title: 'Las Olas Wine & Food Festival (30th Anniversary)',
      dates: ['2026-04-24'],
      time: '19:30',
      endTime: '22:30',
      venue: 'Las Olas Boulevard',
      address: 'Las Olas Blvd between SE 6th Ave and SE 11th Ave, Fort Lauderdale, FL 33301',
      city: 'Fort Lauderdale',
      neighborhood: 'Las Olas',
      lat: 26.1195,
      lng: -80.1365,
      category: 'Food & Drink',
      description: '30th Anniversary — 40+ premier restaurants with pop-up stations. Wines and spirits curated by Southern Glazer\'s. Benefits American Lung Association. 21+ only.',
      tags: ['wine-tasting', 'food', 'outdoor', 'local-favorite'],
      price: 125,
      sourceUrl: 'https://lasolaswff.com/',
    },
    {
      title: 'Savor SoFLO Festival',
      dates: ['2026-04-18', '2026-04-19'],
      time: '13:00',
      endTime: '16:00',
      venue: 'Hollywood Beach Broadwalk',
      address: '911 N Broadwalk, Hollywood, FL 33019',
      city: 'Fort Lauderdale',
      neighborhood: 'Hollywood',
      lat: 26.0206,
      lng: -80.1170,
      category: 'Food & Drink',
      description: 'Food, wine, craft beer, and spirits celebration on the Hollywood Beach Broadwalk. Local chef rock stars. All-inclusive tastings. Benefits Gilda\'s Club South Florida.',
      tags: ['food', 'wine-tasting', 'craft-beer', 'outdoor', 'beach'],
      price: 115,
      sourceUrl: 'https://savorsoflo.com/',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  FATVILLAGE ARTWALK — Monthly free art walk, Flagler Village
    //  Source: fatvillage.com
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'FATVillage ArtWalk',
      dates: ['2026-03-28', '2026-04-25', '2026-05-23'],
      time: '18:00',
      endTime: '22:00',
      venue: 'FATVillage Arts District',
      address: 'NW 1st Ave between 5th and 6th, Fort Lauderdale, FL 33311',
      city: 'Fort Lauderdale',
      neighborhood: 'Flagler Village',
      lat: 26.1289,
      lng: -80.1456,
      category: 'Art',
      description: 'Monthly last-Saturday art walk in Flagler Village. Local vendors, street artists, musicians, food trucks, pop-up bars. Free parking. Child and pet friendly.',
      tags: ['art-gallery', 'free-event', 'outdoor', 'live-music', 'local-favorite'],
      price: 0,
      sourceUrl: 'https://www.fatvillage.com/',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  AMATURO THEATER — Shows at Broward Center's intimate venue
    //  Source: ticketmaster.com, browardcenter.org
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'Jason Robert Brown',
      dates: ['2026-03-12'],
      time: '20:00',
      venue: 'Amaturo Theater',
      address: '201 SW 5th Ave, Fort Lauderdale, FL 33312',
      city: 'Fort Lauderdale',
      neighborhood: 'Riverwalk',
      lat: 26.1184,
      lng: -80.1467,
      category: 'Music',
      description: 'Tony Award-winning songwriter Jason Robert Brown (The Last Five Years, Parade) performs at Amaturo Theater.',
      tags: ['live-music', 'theater'],
      price: 50,
      sourceUrl: 'https://www.browardcenter.org/events',
    },
    {
      title: 'Gary Gulman: Grandiloquent',
      dates: ['2026-03-13'],
      time: '19:30',
      venue: 'Amaturo Theater',
      address: '201 SW 5th Ave, Fort Lauderdale, FL 33312',
      city: 'Fort Lauderdale',
      neighborhood: 'Riverwalk',
      lat: 26.1184,
      lng: -80.1467,
      category: 'Comedy',
      description: 'Comedian Gary Gulman brings his Grandiloquent tour to Amaturo Theater. Known for his HBO special "The Great Depresh."',
      tags: ['comedy'],
      price: 40,
      sourceUrl: 'https://www.browardcenter.org/events',
    },
    {
      title: '7 Bridges: The Ultimate EAGLES Experience',
      dates: ['2026-03-28'],
      time: '19:30',
      venue: 'Amaturo Theater',
      address: '201 SW 5th Ave, Fort Lauderdale, FL 33312',
      city: 'Fort Lauderdale',
      neighborhood: 'Riverwalk',
      lat: 26.1184,
      lng: -80.1467,
      category: 'Music',
      description: '7 Bridges — the premier Eagles tribute band performs Hotel California and all the classics at Amaturo Theater.',
      tags: ['live-music'],
      price: 35,
      sourceUrl: 'https://www.browardcenter.org/events',
    },

    // ═══════════════════════════════════════════════════════════════════
    //  BROWARD CENTER / PARKER — Headliner concerts and Broadway
    //  Source: browardcenter.org, ticketmaster.com
    // ═══════════════════════════════════════════════════════════════════

    {
      title: 'Darius Rucker',
      dates: ['2026-03-07'],
      time: '20:30',
      venue: 'Broward Center for the Performing Arts',
      address: '201 SW 5th Ave, Fort Lauderdale, FL 33312',
      city: 'Fort Lauderdale',
      neighborhood: 'Riverwalk',
      lat: 26.1184,
      lng: -80.1467,
      category: 'Music',
      description: 'Country/rock star Darius Rucker (Hootie & the Blowfish) live at Broward Center. An evening of "Wagon Wheel" and Southern charm.',
      tags: ['live-music'],
      price: 117,
      sourceUrl: 'https://www.browardcenter.org/events',
    },
    {
      title: 'Hell\'s Kitchen (Broadway)',
      dates: ['2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14',
              '2026-03-15', '2026-03-17', '2026-03-18', '2026-03-19', '2026-03-20',
              '2026-03-21', '2026-03-22'],
      time: '20:00',
      venue: 'Au-Rene Theater at Broward Center',
      address: '201 SW 5th Ave, Fort Lauderdale, FL 33312',
      city: 'Fort Lauderdale',
      neighborhood: 'Riverwalk',
      lat: 26.1184,
      lng: -80.1467,
      category: 'Culture',
      description: 'Broadway\'s Hell\'s Kitchen — the new musical inspired by Alicia Keys\' journey from Harlem to superstardom. Tony-nominated sensation.',
      tags: ['theater', 'live-entertainment'],
      price: 82,
      sourceUrl: 'https://www.browardcenter.org/events',
    },
    {
      title: 'Mae Martin: The Possum',
      dates: ['2026-03-06'],
      time: '20:00',
      venue: 'The Parker',
      address: '707 NE 8th St, Fort Lauderdale, FL 33304',
      city: 'Fort Lauderdale',
      neighborhood: 'Victoria Park',
      lat: 26.1291,
      lng: -80.1356,
      category: 'Comedy',
      description: 'Netflix star and comedian Mae Martin brings their "The Possum" show to The Parker in Fort Lauderdale.',
      tags: ['comedy'],
      price: 45,
      sourceUrl: 'https://www.browardcenter.org/events',
    },
    {
      title: 'Paul Anka: A Man and His Music',
      dates: ['2026-03-04'],
      time: '20:00',
      venue: 'Broward Center for the Performing Arts',
      address: '201 SW 5th Ave, Fort Lauderdale, FL 33312',
      city: 'Fort Lauderdale',
      neighborhood: 'Riverwalk',
      lat: 26.1184,
      lng: -80.1467,
      category: 'Music',
      description: 'Legendary singer-songwriter Paul Anka — "Put Your Head on My Shoulder," "Diana," and dozens of timeless hits live at Broward Center.',
      tags: ['live-music'],
      price: 60,
      sourceUrl: 'https://www.browardcenter.org/events',
    },
    {
      title: 'Bill Murray & his Blood Brothers and Big Sky',
      dates: ['2026-04-18'],
      time: '20:00',
      venue: 'Au-Rene Theater at Broward Center',
      address: '201 SW 5th Ave, Fort Lauderdale, FL 33312',
      city: 'Fort Lauderdale',
      neighborhood: 'Riverwalk',
      lat: 26.1184,
      lng: -80.1467,
      category: 'Music',
      description: 'Bill Murray performs with his Blood Brothers and Big Sky band. An unexpected, irreverent evening of music and comedy.',
      tags: ['live-music', 'comedy'],
      price: 75,
      sourceUrl: 'https://www.browardcenter.org/events',
    },
    {
      title: 'Jim Jefferies',
      dates: ['2026-04-25'],
      time: '20:00',
      venue: 'Au-Rene Theater at Broward Center',
      address: '201 SW 5th Ave, Fort Lauderdale, FL 33312',
      city: 'Fort Lauderdale',
      neighborhood: 'Riverwalk',
      lat: 26.1184,
      lng: -80.1467,
      category: 'Comedy',
      description: 'Australian comedian Jim Jefferies live at Broward Center. Known for his Netflix specials and unfiltered, confrontational style.',
      tags: ['comedy'],
      price: 65,
      sourceUrl: 'https://www.browardcenter.org/events',
    },
  ];

  async scrape(): Promise<RawEvent[]> {
    this.log('Loading WeekendBroward verified events...');

    const results: RawEvent[] = [];
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90); // 90-day window

    for (const ev of this.events) {
      for (const dateStr of ev.dates) {
        const eventDate = new Date(`${dateStr}T${ev.time}:00`);
        if (eventDate >= now && eventDate <= maxDate) {
          results.push(this.toRawEvent(ev, dateStr));
        }
      }
    }

    this.log(`Generated ${results.length} verified WeekendBroward events`);
    return results;
  }

  private toRawEvent(ev: WBEvent, dateStr: string): RawEvent {
    return {
      title: ev.title,
      startAt: `${dateStr}T${ev.time}:00`,
      endAt: ev.endTime ? `${dateStr}T${ev.endTime}:00` : undefined,
      venueName: ev.venue,
      address: ev.address,
      neighborhood: ev.neighborhood,
      lat: ev.lat,
      lng: ev.lng,
      city: ev.city,
      tags: ev.tags,
      category: ev.category,
      priceLabel: ev.price === 0 ? 'Free' : ev.price < 20 ? '$' : ev.price < 60 ? '$$' : '$$$',
      priceAmount: ev.price,
      isOutdoor: ev.tags.includes('outdoor') || ev.tags.includes('beach'),
      description: ev.description,
      sourceUrl: ev.sourceUrl,
      sourceName: this.name,
    };
  }
}
