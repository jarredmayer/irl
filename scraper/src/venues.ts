/**
 * Venue Database
 * Normalized venue data with consistent coordinates, capacity, and vibe tags
 */

export interface Venue {
  id: string;
  name: string;
  aliases: string[]; // Alternative names for matching
  address: string;
  neighborhood: string;
  city: 'Miami' | 'Fort Lauderdale';
  lat: number;
  lng: number;
  capacity?: number; // Approximate capacity
  vibeTags: string[]; // e.g., 'intimate', 'massive', 'upscale', 'divey', 'outdoor'
  category: 'club' | 'bar' | 'concert-hall' | 'theater' | 'museum' | 'outdoor' | 'restaurant' | 'hotel' | 'sports' | 'other';
  website?: string;
  imageUrl?: string; // Venue image URL for event fallback
}

// Category-based placeholder images (Unsplash)
export const CATEGORY_IMAGES: Record<string, string> = {
  Music: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
  Art: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=800&q=80',
  Culture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'Food & Drink': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
  Fitness: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
  Wellness: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80',
  Sports: 'https://images.unsplash.com/photo-1461896836934-47568d7a6ea9?w=800&q=80',
  Comedy: 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&q=80',
  Family: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&q=80',
  Community: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
  Nightlife: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
  Outdoors: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80',
  Shopping: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
};

export const VENUES: Record<string, Venue> = {
  // ==========================================
  // NIGHTLIFE - Clubs & Dance Venues
  // ==========================================
  'club-space': {
    id: 'club-space',
    name: 'Club Space',
    aliases: ['Club Space Miami', 'Club Space Terrace', 'Space', 'Space Miami'],
    address: '34 NE 11th St, Miami, FL 33132',
    neighborhood: 'Downtown',
    city: 'Miami',
    lat: 25.7858,
    lng: -80.1927,
    capacity: 3000,
    vibeTags: ['massive', 'legendary', 'techno', 'sunrise', 'marathon'],
    category: 'club',
    website: 'https://clubspace.com/',
  },
  'floyd-miami': {
    id: 'floyd-miami',
    name: 'Floyd Miami',
    aliases: ['Floyd', 'Floyd Club'],
    address: '34 NE 11th St, Miami, FL 33132',
    neighborhood: 'Downtown',
    city: 'Miami',
    lat: 25.7858,
    lng: -80.1927,
    capacity: 300,
    vibeTags: ['intimate', 'underground', 'house', 'techno', 'local-favorite'],
    category: 'club',
    website: 'https://floydmiami.com/',
  },
  'the-ground': {
    id: 'the-ground',
    name: 'The Ground',
    aliases: ['Ground Miami', 'The Ground Miami'],
    address: '34 NE 11th St, Miami, FL 33132',
    neighborhood: 'Downtown',
    city: 'Miami',
    lat: 25.7854,
    lng: -80.1918,
    capacity: 500,
    vibeTags: ['underground', 'bass', 'electronic', 'local-favorite'],
    category: 'club',
    website: 'https://www.thegroundmiami.com/',
  },
  'do-not-sit': {
    id: 'do-not-sit',
    name: 'Do Not Sit On The Furniture',
    aliases: ['Do Not Sit', 'DNS', 'DNSOTF'],
    address: '423 16th St, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    city: 'Miami',
    lat: 25.7867,
    lng: -80.1368,
    capacity: 200,
    vibeTags: ['intimate', 'underground', 'house', 'no-pretense', 'local-favorite'],
    category: 'club',
    website: 'https://www.donotsitmiami.com/',
  },
  'basement-miami': {
    id: 'basement-miami',
    name: 'Basement Miami',
    aliases: ['Basement', 'The Basement'],
    address: '2901 Collins Ave, Miami Beach, FL 33140',
    neighborhood: 'Mid-Beach',
    city: 'Miami',
    lat: 25.8089,
    lng: -80.1267,
    capacity: 500,
    vibeTags: ['upscale', 'hotel', 'bowling', 'ice-skating'],
    category: 'club',
    website: 'https://basementmiami.com/',
  },
  'atv-records': {
    id: 'atv-records',
    name: 'ATV Records',
    aliases: ['ATV'],
    address: '1306 N Miami Ave, Miami, FL 33136',
    neighborhood: 'Wynwood',
    city: 'Miami',
    lat: 25.7889,
    lng: -80.1967,
    capacity: 150,
    vibeTags: ['intimate', 'vinyl', 'underground', 'record-shop', 'local-favorite'],
    category: 'club',
  },
  'factory-town': {
    id: 'factory-town',
    name: 'Factory Town',
    aliases: ['Factory Town Miami'],
    address: '1250 NE 2nd Ave, Miami, FL 33132',
    neighborhood: 'Downtown',
    city: 'Miami',
    lat: 25.7897,
    lng: -80.1897,
    capacity: 1000,
    vibeTags: ['warehouse', 'techno', 'rave'],
    category: 'club',
  },

  // ==========================================
  // LIVE MUSIC VENUES
  // ==========================================
  'zeyzey': {
    id: 'zeyzey',
    name: 'ZeyZey',
    aliases: ['ZeyZey Miami', 'Zey Zey'],
    address: '233 NE 2nd St, Miami, FL 33132',
    neighborhood: 'Downtown',
    city: 'Miami',
    lat: 25.7754,
    lng: -80.1898,
    capacity: 800,
    vibeTags: ['indie', 'eclectic', 'live-music', 'local-favorite'],
    category: 'concert-hall',
    website: 'https://zeyzeymiami.com/',
  },
  'fillmore': {
    id: 'fillmore',
    name: 'Fillmore Miami Beach',
    aliases: ['The Fillmore', 'Fillmore Miami', 'Jackie Gleason Theater'],
    address: '1700 Washington Ave, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    city: 'Miami',
    lat: 25.7908,
    lng: -80.1357,
    capacity: 2700,
    vibeTags: ['iconic', 'concert-hall', 'historic'],
    category: 'concert-hall',
    website: 'https://fillmoremb.com/',
  },
  'north-beach-bandshell': {
    id: 'north-beach-bandshell',
    name: 'North Beach Bandshell',
    aliases: ['Bandshell', 'Miami Beach Bandshell'],
    address: '7275 Collins Ave, Miami Beach, FL 33141',
    neighborhood: 'North Beach',
    city: 'Miami',
    lat: 25.8672,
    lng: -80.1210,
    capacity: 1500,
    vibeTags: ['outdoor', 'beachside', 'community', 'local-favorite'],
    category: 'outdoor',
    website: 'https://northbeachbandshell.com/',
  },
  'las-rosas': {
    id: 'las-rosas',
    name: 'Las Rosas',
    aliases: ['Las Rosas Miami'],
    address: '2898 NW 7th Ave, Miami, FL 33127',
    neighborhood: 'Wynwood',
    city: 'Miami',
    lat: 25.8078,
    lng: -80.2012,
    capacity: 150,
    vibeTags: ['divey', 'punk', 'indie', 'local-favorite'],
    category: 'bar',
    website: 'https://lasrosasbar.com/',
  },
  'churchills': {
    id: 'churchills',
    name: "Churchill's Pub",
    aliases: ['Churchills', "Churchill's"],
    address: '5501 NE 2nd Ave, Miami, FL 33137',
    neighborhood: 'Little Haiti',
    city: 'Miami',
    lat: 25.8310,
    lng: -80.1929,
    capacity: 300,
    vibeTags: ['divey', 'punk', 'legendary', 'local-favorite'],
    category: 'bar',
    website: 'https://churchillspub.com/',
  },
  'lagniappe-house': {
    id: 'lagniappe-house',
    name: 'Lagniappe House',
    aliases: ['Lagniappe'],
    address: '3425 NE 2nd Ave, Miami, FL 33137',
    neighborhood: 'Midtown',
    city: 'Miami',
    lat: 25.8086,
    lng: -80.1916,
    capacity: 100,
    vibeTags: ['intimate', 'wine-bar', 'jazz', 'courtyard', 'local-favorite'],
    category: 'bar',
  },
  'ball-and-chain': {
    id: 'ball-and-chain',
    name: 'Ball & Chain',
    aliases: ['Ball and Chain'],
    address: '1513 SW 8th St, Miami, FL 33135',
    neighborhood: 'Little Havana',
    city: 'Miami',
    lat: 25.7656,
    lng: -80.2194,
    capacity: 400,
    vibeTags: ['latin', 'salsa', 'historic', 'live-music', 'local-favorite'],
    category: 'bar',
    website: 'https://ballandchainmiami.com/',
  },
  'gramps': {
    id: 'gramps',
    name: 'Gramps',
    aliases: ['Gramps Wynwood'],
    address: '176 NW 24th St, Miami, FL 33127',
    neighborhood: 'Wynwood',
    city: 'Miami',
    lat: 25.8002,
    lng: -80.1946,
    capacity: 200,
    vibeTags: ['divey', 'drag', 'queer', 'local-favorite'],
    category: 'bar',
  },
  'gramps-getaway': {
    id: 'gramps-getaway',
    name: 'Gramps Getaway',
    aliases: ['Gramps Getaway Miami Beach'],
    address: '8000 Collins Ave, Miami Beach, FL 33141',
    neighborhood: 'North Beach',
    city: 'Miami',
    lat: 25.8744,
    lng: -80.1213,
    capacity: 300,
    vibeTags: ['waterfront', 'outdoor', 'sunset', 'local-favorite'],
    category: 'bar',
    website: 'https://www.grampsgetaway.com/',
  },

  // ==========================================
  // MAJOR CONCERT VENUES
  // ==========================================
  'kaseya-center': {
    id: 'kaseya-center',
    name: 'Kaseya Center',
    aliases: ['FTX Arena', 'American Airlines Arena', 'AAA'],
    address: '601 Biscayne Blvd, Miami, FL 33132',
    neighborhood: 'Downtown',
    city: 'Miami',
    lat: 25.7814,
    lng: -80.1870,
    capacity: 21000,
    vibeTags: ['massive', 'arena', 'sports', 'concerts'],
    category: 'sports',
    website: 'https://www.kaseyacenter.com/',
  },
  'hard-rock-live': {
    id: 'hard-rock-live',
    name: 'Hard Rock Live',
    aliases: ['Hard Rock Live Hollywood'],
    address: '1 Seminole Way, Hollywood, FL 33314',
    neighborhood: 'Hollywood',
    city: 'Fort Lauderdale',
    lat: 26.0510,
    lng: -80.2112,
    capacity: 7000,
    vibeTags: ['casino', 'concerts', 'big-acts'],
    category: 'concert-hall',
    website: 'https://www.seminolehardrockhollywood.com/',
  },
  'fpl-solar': {
    id: 'fpl-solar',
    name: 'FPL Solar Amphitheater',
    aliases: ['Bayfront Park Amphitheater', 'FPL Solar'],
    address: '301 N Biscayne Blvd, Miami, FL 33132',
    neighborhood: 'Downtown',
    city: 'Miami',
    lat: 25.7753,
    lng: -80.1858,
    capacity: 10000,
    vibeTags: ['outdoor', 'waterfront', 'festivals'],
    category: 'outdoor',
  },
  'hard-rock-stadium': {
    id: 'hard-rock-stadium',
    name: 'Hard Rock Stadium',
    aliases: ['Dolphins Stadium', 'Sun Life Stadium', 'Miami International Autodrome'],
    address: '347 Don Shula Dr, Miami Gardens, FL 33056',
    neighborhood: 'Miami Gardens',
    city: 'Miami',
    lat: 25.9580,
    lng: -80.2389,
    capacity: 65000,
    vibeTags: ['massive', 'stadium', 'sports', 'concerts', 'festivals'],
    category: 'sports',
  },
  'amerant-bank-arena': {
    id: 'amerant-bank-arena',
    name: 'Amerant Bank Arena',
    aliases: ['BB&T Center', 'FLA Live Arena', 'Panthers Arena', 'Sunrise Arena'],
    address: '1 Panther Pkwy, Sunrise, FL 33323',
    neighborhood: 'Sunrise',
    city: 'Fort Lauderdale',
    lat: 26.1584,
    lng: -80.3256,
    capacity: 20000,
    vibeTags: ['massive', 'arena', 'sports', 'concerts'],
    category: 'sports',
  },
  'miami-freedom-park': {
    id: 'miami-freedom-park',
    name: 'Miami Freedom Park',
    aliases: ['Inter Miami Stadium', 'Freedom Park'],
    address: '3500 NW 8th St, Miami, FL 33125',
    neighborhood: 'Flagami',
    city: 'Miami',
    lat: 25.7717,
    lng: -80.2564,
    capacity: 25000,
    vibeTags: ['stadium', 'sports', 'soccer'],
    category: 'sports',
  },

  // ==========================================
  // THEATERS & PERFORMING ARTS
  // ==========================================
  'arsht-center': {
    id: 'arsht-center',
    name: 'Adrienne Arsht Center',
    aliases: ['Arsht Center', 'Adrienne Arsht Center for the Performing Arts'],
    address: '1300 Biscayne Blvd, Miami, FL 33132',
    neighborhood: 'Downtown',
    city: 'Miami',
    lat: 25.7847,
    lng: -80.1886,
    capacity: 2400,
    vibeTags: ['upscale', 'performing-arts', 'world-class'],
    category: 'theater',
    website: 'https://arshtcenter.org/',
  },
  'colony-theatre': {
    id: 'colony-theatre',
    name: 'Colony Theatre',
    aliases: ['Colony Theater'],
    address: '1040 Lincoln Rd, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    city: 'Miami',
    lat: 25.7903,
    lng: -80.1401,
    capacity: 465,
    vibeTags: ['intimate', 'art-deco', 'historic'],
    category: 'theater',
  },
  'olympia-theater': {
    id: 'olympia-theater',
    name: 'Olympia Theater',
    aliases: ['Olympia Theatre', 'Gusman Center'],
    address: '174 E Flagler St, Miami, FL 33131',
    neighborhood: 'Downtown',
    city: 'Miami',
    lat: 25.7746,
    lng: -80.1907,
    capacity: 1700,
    vibeTags: ['historic', 'ornate', 'atmospheric'],
    category: 'theater',
  },
  'faena-theater': {
    id: 'faena-theater',
    name: 'Faena Theater',
    aliases: ['Faena Theatre'],
    address: '3201 Collins Ave, Miami Beach, FL 33140',
    neighborhood: 'Mid-Beach',
    city: 'Miami',
    lat: 25.8131,
    lng: -80.1262,
    capacity: 150,
    vibeTags: ['upscale', 'intimate', 'cabaret', 'exclusive'],
    category: 'theater',
    website: 'https://www.faena.com/miami-beach/theater',
  },
  'broward-center': {
    id: 'broward-center',
    name: 'Broward Center',
    aliases: ['Broward Center for the Performing Arts', 'BCPA'],
    address: '201 SW 5th Ave, Fort Lauderdale, FL 33312',
    neighborhood: 'Downtown FLL',
    city: 'Fort Lauderdale',
    lat: 25.7669,
    lng: -80.1436,
    capacity: 2700,
    vibeTags: ['performing-arts', 'broadway', 'concerts'],
    category: 'theater',
    website: 'https://www.browardcenter.org/',
  },
  'revolution-live': {
    id: 'revolution-live',
    name: 'Revolution Live',
    aliases: ['Revolution'],
    address: '100 SW 3rd Ave, Fort Lauderdale, FL 33312',
    neighborhood: 'Downtown FLL',
    city: 'Fort Lauderdale',
    lat: 25.7657,
    lng: -80.1452,
    capacity: 1400,
    vibeTags: ['rock', 'indie', 'standing-room'],
    category: 'concert-hall',
    website: 'https://jointherevolution.net/',
  },
  'culture-room': {
    id: 'culture-room',
    name: 'Culture Room',
    aliases: [],
    address: '3045 N Federal Hwy, Fort Lauderdale, FL 33306',
    neighborhood: 'Fort Lauderdale',
    city: 'Fort Lauderdale',
    lat: 26.1535,
    lng: -80.1197,
    capacity: 600,
    vibeTags: ['intimate', 'rock', 'indie', 'local-favorite'],
    category: 'concert-hall',
  },

  // ==========================================
  // COMEDY
  // ==========================================
  'miami-improv': {
    id: 'miami-improv',
    name: 'Miami Improv',
    aliases: ['Improv Miami', 'The Improv', 'Miami Improv Comedy Club'],
    address: '3450 NW 83rd Ave #224, Doral, FL 33166',
    neighborhood: 'Doral',
    city: 'Miami',
    lat: 25.8073,
    lng: -80.3318,
    capacity: 400,
    vibeTags: ['comedy', 'standup', 'big-names'],
    category: 'theater',
    website: 'https://improv.com/miami/',
  },
  'dania-improv': {
    id: 'dania-improv',
    name: 'Dania Beach Improv',
    aliases: ['Dania Improv', 'Fort Lauderdale Improv', 'FTL Improv', 'Improv Fort Lauderdale'],
    address: '5700 Seminole Way, Hollywood, FL 33314',
    neighborhood: 'Hollywood',
    city: 'Fort Lauderdale',
    lat: 26.0515,
    lng: -80.2105,
    capacity: 400,
    vibeTags: ['comedy', 'standup', 'casino'],
    category: 'theater',
    website: 'https://improv.com/fort-lauderdale/',
  },

  // ==========================================
  // MUSEUMS & CULTURAL
  // ==========================================
  'pamm': {
    id: 'pamm',
    name: 'Pérez Art Museum Miami',
    aliases: ['PAMM', 'Perez Art Museum', 'Miami Art Museum'],
    address: '1103 Biscayne Blvd, Miami, FL 33132',
    neighborhood: 'Downtown',
    city: 'Miami',
    lat: 25.7859,
    lng: -80.1863,
    capacity: 500,
    vibeTags: ['museum', 'waterfront', 'contemporary-art'],
    category: 'museum',
    website: 'https://www.pamm.org/',
  },
  'the-bass': {
    id: 'the-bass',
    name: 'The Bass',
    aliases: ['Bass Museum', 'The Bass Museum of Art'],
    address: '2100 Collins Ave, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    city: 'Miami',
    lat: 25.7950,
    lng: -80.1302,
    capacity: 300,
    vibeTags: ['museum', 'contemporary-art', 'architecture'],
    category: 'museum',
    website: 'https://thebass.org/',
  },
  'ica-miami': {
    id: 'ica-miami',
    name: 'ICA Miami',
    aliases: ['Institute of Contemporary Art Miami', 'ICA'],
    address: '61 NE 41st St, Miami, FL 33137',
    neighborhood: 'Design District',
    city: 'Miami',
    lat: 25.8138,
    lng: -80.1927,
    capacity: 200,
    vibeTags: ['museum', 'free', 'contemporary-art', 'design-district'],
    category: 'museum',
    website: 'https://icamiami.org/',
  },
  'vizcaya': {
    id: 'vizcaya',
    name: 'Vizcaya Museum and Gardens',
    aliases: ['Vizcaya', 'Vizcaya Museum & Gardens'],
    address: '3251 S Miami Ave, Miami, FL 33129',
    neighborhood: 'Coconut Grove',
    city: 'Miami',
    lat: 25.7445,
    lng: -80.2106,
    capacity: 500,
    vibeTags: ['historic', 'gardens', 'waterfront', 'romantic', 'iconic'],
    category: 'museum',
    website: 'https://vizcaya.org/',
  },
  'frost-science': {
    id: 'frost-science',
    name: 'Phillip and Patricia Frost Museum of Science',
    aliases: ['Frost Science', 'Frost Museum', 'Science Museum'],
    address: '1101 Biscayne Blvd, Miami, FL 33132',
    neighborhood: 'Downtown',
    city: 'Miami',
    lat: 25.7853,
    lng: -80.1876,
    capacity: 1000,
    vibeTags: ['museum', 'family-friendly', 'planetarium', 'aquarium'],
    category: 'museum',
    website: 'https://frostscience.org/',
  },
  'nsu-art-museum': {
    id: 'nsu-art-museum',
    name: 'NSU Art Museum',
    aliases: ['NSU Art Museum Fort Lauderdale', 'MoCA Fort Lauderdale'],
    address: '1 E Las Olas Blvd, Fort Lauderdale, FL 33301',
    neighborhood: 'Las Olas',
    city: 'Fort Lauderdale',
    lat: 26.1186,
    lng: -80.1434,
    capacity: 300,
    vibeTags: ['museum', 'contemporary-art'],
    category: 'museum',
    website: 'https://nsuartmuseum.org/',
  },
  'deering-estate': {
    id: 'deering-estate',
    name: 'Deering Estate',
    aliases: ['Deering Estate at Cutler'],
    address: '16701 SW 72nd Ave, Miami, FL 33157',
    neighborhood: 'Palmetto Bay',
    city: 'Miami',
    lat: 25.6154,
    lng: -80.3103,
    capacity: 1000,
    vibeTags: ['historic', 'nature', 'waterfront', 'concerts'],
    category: 'outdoor',
    website: 'https://deeringestate.org/',
  },
  'fairchild': {
    id: 'fairchild',
    name: 'Fairchild Tropical Botanic Garden',
    aliases: ['Fairchild Garden', 'Fairchild Gardens'],
    address: '10901 Old Cutler Rd, Coral Gables, FL 33156',
    neighborhood: 'Coral Gables',
    city: 'Miami',
    lat: 25.6773,
    lng: -80.2743,
    capacity: 2000,
    vibeTags: ['garden', 'nature', 'family-friendly', 'events'],
    category: 'outdoor',
    website: 'https://fairchildgarden.org/',
  },
  'pinecrest-gardens': {
    id: 'pinecrest-gardens',
    name: 'Pinecrest Gardens',
    aliases: ['Pinecrest Garden'],
    address: '11000 Red Rd, Pinecrest, FL 33156',
    neighborhood: 'Pinecrest',
    city: 'Miami',
    lat: 25.6653,
    lng: -80.2805,
    capacity: 1000,
    vibeTags: ['garden', 'family-friendly', 'concerts'],
    category: 'outdoor',
    website: 'https://www.pinecrestgardens.org/',
  },
  'jungle-island': {
    id: 'jungle-island',
    name: 'Jungle Island',
    aliases: ['Jungle Island Miami'],
    address: '1111 Parrot Jungle Trail, Miami, FL 33132',
    neighborhood: 'Downtown',
    city: 'Miami',
    lat: 25.7853,
    lng: -80.1750,
    capacity: 2000,
    vibeTags: ['family-friendly', 'animals', 'events'],
    category: 'outdoor',
    website: 'https://www.jungleisland.com/',
  },
  'zoo-miami': {
    id: 'zoo-miami',
    name: 'Zoo Miami',
    aliases: ['Miami MetroZoo', 'MetroZoo'],
    address: '12400 SW 152nd St, Miami, FL 33177',
    neighborhood: 'South Miami',
    city: 'Miami',
    lat: 25.6106,
    lng: -80.3984,
    capacity: 5000,
    vibeTags: ['family-friendly', 'animals', 'outdoor'],
    category: 'outdoor',
    website: 'https://zoomiami.org/',
  },

  // ==========================================
  // OUTDOOR & PARKS
  // ==========================================
  'bayfront-park': {
    id: 'bayfront-park',
    name: 'Bayfront Park',
    aliases: ['Bayfront Park Miami'],
    address: '301 N Biscayne Blvd, Miami, FL 33132',
    neighborhood: 'Downtown',
    city: 'Miami',
    lat: 25.7753,
    lng: -80.1858,
    capacity: 10000,
    vibeTags: ['outdoor', 'waterfront', 'festivals', 'free'],
    category: 'outdoor',
  },
  'soundscape-park': {
    id: 'soundscape-park',
    name: 'SoundScape Park',
    aliases: ['Soundscape Park', 'NWS Wallcast'],
    address: '500 17th St, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    city: 'Miami',
    lat: 25.7911,
    lng: -80.1368,
    capacity: 2000,
    vibeTags: ['outdoor', 'free', 'classical', 'community'],
    category: 'outdoor',
  },
  'wynwood-walls': {
    id: 'wynwood-walls',
    name: 'Wynwood Walls',
    aliases: ['The Wynwood Walls'],
    address: '2520 NW 2nd Ave, Miami, FL 33127',
    neighborhood: 'Wynwood',
    city: 'Miami',
    lat: 25.8010,
    lng: -80.1995,
    capacity: 500,
    vibeTags: ['outdoor', 'art', 'murals', 'iconic'],
    category: 'outdoor',
    website: 'https://thewynwoodwalls.com/',
  },
  'wynwood-marketplace': {
    id: 'wynwood-marketplace',
    name: 'Wynwood Marketplace',
    aliases: ['The Wynwood Marketplace'],
    address: '2250 NW 2nd Ave, Miami, FL 33127',
    neighborhood: 'Wynwood',
    city: 'Miami',
    lat: 25.7986,
    lng: -80.1994,
    capacity: 1000,
    vibeTags: ['outdoor', 'food', 'events', 'festivals'],
    category: 'outdoor',
  },

  // ==========================================
  // CINEMA
  // ==========================================
  'rooftop-cinema': {
    id: 'rooftop-cinema',
    name: 'Rooftop Cinema Club South Beach',
    aliases: ['Rooftop Cinema', 'Rooftop Cinema Club'],
    address: '1111 Lincoln Rd, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    city: 'Miami',
    lat: 25.7906,
    lng: -80.1394,
    capacity: 100,
    vibeTags: ['outdoor', 'rooftop', 'romantic', 'sunset'],
    category: 'other',
    website: 'https://rooftopcinemaclub.com/miami/',
  },
  'o-cinema': {
    id: 'o-cinema',
    name: 'O Cinema South Beach',
    aliases: ['O Cinema', 'O Cinema Miami Beach'],
    address: '1130 Washington Ave, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    city: 'Miami',
    lat: 25.7821,
    lng: -80.1344,
    capacity: 150,
    vibeTags: ['indie', 'arthouse', 'film-festival'],
    category: 'theater',
    website: 'https://www.o-cinema.org/',
  },

  // ==========================================
  // HOTELS WITH EVENT SPACES
  // ==========================================
  'fontainebleau': {
    id: 'fontainebleau',
    name: 'Fontainebleau Miami Beach',
    aliases: ['Fontainebleau', 'Fontainebleau Hotel'],
    address: '4441 Collins Ave, Miami Beach, FL 33140',
    neighborhood: 'Mid-Beach',
    city: 'Miami',
    lat: 25.8201,
    lng: -80.1225,
    capacity: 2000,
    vibeTags: ['upscale', 'hotel', 'pool-party', 'iconic'],
    category: 'hotel',
    website: 'https://www.fontainebleau.com/',
  },
  'faena-hotel': {
    id: 'faena-hotel',
    name: 'Faena Hotel Miami Beach',
    aliases: ['Faena', 'Faena Miami Beach'],
    address: '3201 Collins Ave, Miami Beach, FL 33140',
    neighborhood: 'Mid-Beach',
    city: 'Miami',
    lat: 25.8131,
    lng: -80.1262,
    capacity: 500,
    vibeTags: ['luxury', 'exclusive', 'art', 'upscale'],
    category: 'hotel',
    website: 'https://www.faena.com/miami-beach',
  },

  // ==========================================
  // FARMERS MARKETS
  // ==========================================
  'lincoln-road-farmers-market': {
    id: 'lincoln-road-farmers-market',
    name: 'Lincoln Road Farmers Market',
    aliases: ['Lincoln Rd Farmers Market', 'South Beach Farmers Market'],
    address: 'Lincoln Rd, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    city: 'Miami',
    lat: 25.7904,
    lng: -80.1399,
    capacity: 1000,
    vibeTags: ['outdoor', 'local-favorite', 'free', 'family-friendly'],
    category: 'outdoor',
  },
  'coconut-grove-farmers-market': {
    id: 'coconut-grove-farmers-market',
    name: 'Coconut Grove Farmers Market',
    aliases: ['Grove Farmers Market', 'CocoWalk Farmers Market'],
    address: '3300 Grand Ave, Coconut Grove, FL 33133',
    neighborhood: 'Coconut Grove',
    city: 'Miami',
    lat: 25.7291,
    lng: -80.2419,
    capacity: 500,
    vibeTags: ['outdoor', 'local-favorite', 'free', 'family-friendly'],
    category: 'outdoor',
  },
  'coral-gables-farmers-market': {
    id: 'coral-gables-farmers-market',
    name: 'Coral Gables Farmers Market',
    aliases: ['Gables Farmers Market'],
    address: '405 Biltmore Way, Coral Gables, FL 33134',
    neighborhood: 'Coral Gables',
    city: 'Miami',
    lat: 25.7508,
    lng: -80.2592,
    capacity: 500,
    vibeTags: ['outdoor', 'local-favorite', 'free', 'family-friendly'],
    category: 'outdoor',
  },
  'legion-park-farmers-market': {
    id: 'legion-park-farmers-market',
    name: 'Legion Park Farmers Market',
    aliases: ['Upper Eastside Farmers Market', 'Legion Park Market'],
    address: '6447 NE 7th Ave, Miami, FL 33138',
    neighborhood: 'Little Haiti',
    city: 'Miami',
    lat: 25.8245,
    lng: -80.1829,
    capacity: 500,
    vibeTags: ['outdoor', 'local-favorite', 'free', 'family-friendly'],
    category: 'outdoor',
  },
  'surfside-farmers-market': {
    id: 'surfside-farmers-market',
    name: 'Surfside Farmers Market',
    aliases: ['Surfside Market'],
    address: '9301 Collins Ave, Surfside, FL 33154',
    neighborhood: 'Surfside',
    city: 'Miami',
    lat: 25.8768,
    lng: -80.1245,
    capacity: 300,
    vibeTags: ['outdoor', 'local-favorite', 'free', 'family-friendly', 'beach'],
    category: 'outdoor',
  },

  // ==========================================
  // BEACHES & PARKS
  // ==========================================
  '3rd-street-beach': {
    id: '3rd-street-beach',
    name: '3rd Street Beach',
    aliases: ['3rd St Beach', 'Third Street Beach'],
    address: '3rd St & Ocean Dr, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    city: 'Miami',
    lat: 25.768,
    lng: -80.13,
    capacity: 1000,
    vibeTags: ['beach', 'outdoor', 'free', 'sunrise'],
    category: 'outdoor',
  },
  'lummus-park': {
    id: 'lummus-park',
    name: 'Lummus Park',
    aliases: ['Lummus Park Beach', 'South Beach Park'],
    address: 'Ocean Dr & 10th St, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    city: 'Miami',
    lat: 25.778,
    lng: -80.13,
    capacity: 2000,
    vibeTags: ['beach', 'outdoor', 'free', 'iconic'],
    category: 'outdoor',
  },
  'peacock-park': {
    id: 'peacock-park',
    name: 'Peacock Park',
    aliases: ['Peacock Park Coconut Grove'],
    address: '2820 McFarlane Rd, Miami, FL 33133',
    neighborhood: 'Coconut Grove',
    city: 'Miami',
    lat: 25.7267,
    lng: -80.242,
    capacity: 1000,
    vibeTags: ['outdoor', 'waterfront', 'family-friendly', 'community'],
    category: 'outdoor',
  },
  'underline-brickell': {
    id: 'underline-brickell',
    name: 'The Underline - Brickell Backyard',
    aliases: ['The Underline', 'Underline Brickell', 'Brickell Backyard'],
    address: '1075 SW 8th St, Miami, FL 33130',
    neighborhood: 'Brickell',
    city: 'Miami',
    lat: 25.765,
    lng: -80.205,
    capacity: 500,
    vibeTags: ['outdoor', 'free', 'fitness', 'community', 'local-favorite'],
    category: 'outdoor',
  },
  'regatta-park': {
    id: 'regatta-park',
    name: 'Regatta Park',
    aliases: ['Regatta Park Coconut Grove'],
    address: 'Pan American Dr, Coconut Grove, FL 33133',
    neighborhood: 'Coconut Grove',
    city: 'Miami',
    lat: 25.7267,
    lng: -80.2378,
    capacity: 1000,
    vibeTags: ['outdoor', 'waterfront', 'fitness', 'community'],
    category: 'outdoor',
  },
  'snyder-park': {
    id: 'snyder-park',
    name: 'Snyder Park',
    aliases: ['Snyder Park Fort Lauderdale'],
    address: '3299 SW 4th Ave, Fort Lauderdale, FL 33315',
    neighborhood: 'Fort Lauderdale',
    city: 'Fort Lauderdale',
    lat: 26.0956,
    lng: -80.1567,
    capacity: 500,
    vibeTags: ['outdoor', 'fitness', 'community'],
    category: 'outdoor',
  },
  'collins-park-beach': {
    id: 'collins-park-beach',
    name: 'Collins Park Beach',
    aliases: ['Collins Park', '21st Street Beach'],
    address: '21st & Collins Ave, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    city: 'Miami',
    lat: 25.7942,
    lng: -80.1227,
    capacity: 500,
    vibeTags: ['beach', 'outdoor', 'free'],
    category: 'outdoor',
  },
  'smorgasburg-miami': {
    id: 'smorgasburg-miami',
    name: 'Smorgasburg Miami',
    aliases: ['Smorgasburg', 'Smorgasburg Museum Park'],
    address: 'Museum Park, 1075 Biscayne Blvd, Miami, FL 33132',
    neighborhood: 'Downtown',
    city: 'Miami',
    lat: 25.7847,
    lng: -80.1867,
    capacity: 2000,
    vibeTags: ['outdoor', 'food', 'local-favorite', 'family-friendly'],
    category: 'outdoor',
  },
  'strawberry-moon': {
    id: 'strawberry-moon',
    name: 'Strawberry Moon at The Goodtime Hotel',
    aliases: ['Strawberry Moon', 'Goodtime Hotel Pool'],
    address: '601 Washington Ave, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    city: 'Miami',
    lat: 25.7702,
    lng: -80.134,
    capacity: 500,
    vibeTags: ['pool', 'upscale', 'nightlife', 'brunch'],
    category: 'hotel',
  },
  'ftl-war-memorial': {
    id: 'ftl-war-memorial',
    name: 'FTL War Memorial',
    aliases: ['Fort Lauderdale War Memorial', 'War Memorial Park'],
    address: '800 NE 8th St, Fort Lauderdale, FL 33304',
    neighborhood: 'Fort Lauderdale',
    city: 'Fort Lauderdale',
    lat: 26.1289,
    lng: -80.1367,
    capacity: 500,
    vibeTags: ['outdoor', 'fitness', 'community'],
    category: 'outdoor',
  },

  // ==========================================
  // FITNESS & CYCLING
  // ==========================================
  'sun-cycling': {
    id: 'sun-cycling',
    name: 'Sun Cycling',
    aliases: ['Sun Cycling Miami', 'Sun Cycling Coconut Grove'],
    address: '3001 SW 27th Ave, Miami, FL 33133',
    neighborhood: 'Coconut Grove',
    city: 'Miami',
    lat: 25.744,
    lng: -80.2389,
    capacity: 50,
    vibeTags: ['fitness', 'cycling', 'local-favorite', 'community'],
    category: 'other',
  },
  'bike-tech': {
    id: 'bike-tech',
    name: 'Bike Tech',
    aliases: ['Bike Tech Miami', 'Bike Tech Downtown'],
    address: '1622 NE 2nd Ave, Miami, FL 33132',
    neighborhood: 'Downtown',
    city: 'Miami',
    lat: 25.788,
    lng: -80.1918,
    capacity: 50,
    vibeTags: ['fitness', 'cycling', 'community'],
    category: 'other',
  },
  'breaking-the-cycle': {
    id: 'breaking-the-cycle',
    name: 'Breaking The Cycle',
    aliases: ['Breaking The Cycle Miami'],
    address: '10400 NW 7th Ave, Miami, FL 33150',
    neighborhood: 'Little Haiti',
    city: 'Miami',
    lat: 25.849,
    lng: -80.2106,
    capacity: 50,
    vibeTags: ['fitness', 'cycling', 'community', 'local-favorite'],
    category: 'other',
  },
  'ponce-middle-school': {
    id: 'ponce-middle-school',
    name: 'Ponce de Leon Middle School',
    aliases: ['Ponce Middle School', 'Ponce de Leon'],
    address: '5801 Augusto St, Coral Gables, FL 33146',
    neighborhood: 'Coral Gables',
    city: 'Miami',
    lat: 25.712,
    lng: -80.278,
    capacity: 200,
    vibeTags: ['fitness', 'cycling', 'community'],
    category: 'other',
  },
  'nike-lincoln-road': {
    id: 'nike-lincoln-road',
    name: 'Nike Store Lincoln Road',
    aliases: ['Nike Lincoln Road', 'Nike South Beach', 'Nike Run Club Lincoln Road'],
    address: '1035 Lincoln Rd, Miami Beach, FL 33139',
    neighborhood: 'South Beach',
    city: 'Miami',
    lat: 25.7906,
    lng: -80.14,
    capacity: 100,
    vibeTags: ['fitness', 'running', 'free'],
    category: 'other',
  },
  'on-store-design-district': {
    id: 'on-store-design-district',
    name: 'On Store Miami Design District',
    aliases: ['On Running Design District', 'On Store Miami'],
    address: '125 NE 40th St, Miami, FL 33137',
    neighborhood: 'Design District',
    city: 'Miami',
    lat: 25.8135,
    lng: -80.1918,
    capacity: 50,
    vibeTags: ['fitness', 'running', 'free'],
    category: 'other',
  },

  // ==========================================
  // RETAIL & POP-UPS
  // ==========================================
  '260-sample-sale': {
    id: '260-sample-sale',
    name: '260 Sample Sale',
    aliases: ['260 Sample', '260 Wynwood'],
    address: '2450 NW 2nd Ave, Miami, FL 33127',
    neighborhood: 'Wynwood',
    city: 'Miami',
    lat: 25.7986,
    lng: -80.1996,
    capacity: 300,
    vibeTags: ['shopping', 'fashion', 'deals'],
    category: 'other',
  },
  'salty-donut': {
    id: 'salty-donut',
    name: 'The Salty Donut',
    aliases: ['Salty Donut', 'Salty Donut Wynwood'],
    address: '50 NW 23rd St, Miami, FL 33127',
    neighborhood: 'Wynwood',
    city: 'Miami',
    lat: 25.7993,
    lng: -80.1949,
    capacity: 50,
    vibeTags: ['coffee', 'local-favorite', 'community'],
    category: 'restaurant',
  },
};

/**
 * Find venue by name (checks name and aliases)
 */
// Generic location names that should NOT fuzzy-match to specific venues
const GENERIC_LOCATIONS = [
  'miami', 'miami beach', 'south beach', 'north beach', 'mid-beach',
  'coral gables', 'coconut grove', 'wynwood', 'brickell', 'downtown',
  'little havana', 'little haiti', 'design district', 'edgewater',
  'fort lauderdale', 'hollywood', 'doral', 'aventura', 'surfside',
  'key biscayne', 'bal harbour', 'sunny isles', 'north miami',
  'tba', 'various', 'multiple locations', 'online', 'virtual',
];

export function findVenue(name: string): Venue | undefined {
  const normalized = name.toLowerCase().trim();

  // Don't match generic location names
  if (GENERIC_LOCATIONS.includes(normalized)) {
    return undefined;
  }

  // Exact match on venue name
  for (const venue of Object.values(VENUES)) {
    if (venue.name.toLowerCase() === normalized) {
      return venue;
    }
    for (const alias of venue.aliases) {
      if (alias.toLowerCase() === normalized) {
        return venue;
      }
    }
  }

  // Fuzzy match - but only if query is specific enough (>15 chars or contains specific words)
  const isSpecificEnough = normalized.length > 15 ||
    /\b(theater|theatre|center|museum|park|arena|stadium|club|bar|restaurant|hotel|hall|gallery)\b/i.test(normalized);

  if (!isSpecificEnough) {
    return undefined;
  }

  for (const venue of Object.values(VENUES)) {
    const venueLower = venue.name.toLowerCase();
    if (venueLower.includes(normalized) || normalized.includes(venueLower)) {
      return venue;
    }
    for (const alias of venue.aliases) {
      const aliasLower = alias.toLowerCase();
      if (aliasLower.includes(normalized) || normalized.includes(aliasLower)) {
        return venue;
      }
    }
  }

  return undefined;
}

/**
 * Get venues by category
 */
export function getVenuesByCategory(category: Venue['category']): Venue[] {
  return Object.values(VENUES).filter(v => v.category === category);
}

/**
 * Get venues by vibe tag
 */
export function getVenuesByVibe(vibe: string): Venue[] {
  return Object.values(VENUES).filter(v => v.vibeTags.includes(vibe));
}

/**
 * Get venues by city
 */
export function getVenuesByCity(city: 'Miami' | 'Fort Lauderdale'): Venue[] {
  return Object.values(VENUES).filter(v => v.city === city);
}

/**
 * Apply canonical venue data to an event
 * Returns updated fields if venue is found, null otherwise
 */
export function applyVenueData(event: {
  venueName?: string;
  address?: string;
  neighborhood?: string;
  lat?: number | null;
  lng?: number | null;
  city?: string;
}): Partial<{
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  city: 'Miami' | 'Fort Lauderdale';
}> | null {
  if (!event.venueName) return null;

  const venue = findVenue(event.venueName);
  if (!venue) return null;

  return {
    address: venue.address,
    neighborhood: venue.neighborhood,
    lat: venue.lat,
    lng: venue.lng,
    city: venue.city,
  };
}

/**
 * Get stats about venue coverage for a set of events
 */
export function getVenueCoverage(events: Array<{ venueName?: string }>): {
  total: number;
  matched: number;
  unmatched: string[];
} {
  const unmatched = new Set<string>();
  let matched = 0;
  let total = 0;

  for (const event of events) {
    if (!event.venueName) continue;
    total++;
    if (findVenue(event.venueName)) {
      matched++;
    } else {
      unmatched.add(event.venueName);
    }
  }

  return {
    total,
    matched,
    unmatched: [...unmatched].sort(),
  };
}
