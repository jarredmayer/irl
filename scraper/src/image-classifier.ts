/**
 * Image Classifier
 *
 * Classifies event images into quality tiers and provides prompts
 * for AI image generation when needed.
 *
 * Image Tiers:
 * - 'hero': High-quality, aspect ratio suitable for hero display (16:9, wide)
 * - 'card': Medium-quality, suitable for card display (1:1, square)
 * - 'none': No image or unusable quality
 *
 * Image Sources:
 * - 'event': Image directly from event (flyer, poster)
 * - 'venue': Image from venue (stock venue photo)
 * - 'organizer': Image from organizer's profile
 * - 'stock': Generic stock image
 * - 'generated': AI-generated image
 * - 'none': No image available
 */

import type { RawEvent, IRLEvent, ImageTier, ImageSource } from './types.js';

// Minimum dimensions for each tier
const HERO_MIN_WIDTH = 800;
const HERO_MIN_HEIGHT = 400;
const CARD_MIN_WIDTH = 300;
const CARD_MIN_HEIGHT = 300;

// Known CDN patterns that indicate quality images
const QUALITY_CDNS = [
  'cdn.ra.co',                    // Resident Advisor
  'dice-media.imgix.net',         // Dice.fm
  'img.evbuc.com',                // Eventbrite
  'cdn.lu.ma',                    // Luma
  'media.feverup.com',            // Fever
  'images.unsplash.com',          // Unsplash (quality stock)
  'cloudinary.com',               // Cloudinary (usually optimized)
];

// Patterns that indicate low-quality or placeholder images
const LOW_QUALITY_PATTERNS = [
  /placeholder/i,
  /default/i,
  /no[-_]?image/i,
  /missing/i,
  /blank/i,
  /logo[-_]?only/i,
  /icon[-_]?\d+/i,
  /avatar/i,
  /profile[-_]?pic/i,
  /thumb[-_]?\d+x\d+/i,           // Small thumbnails
  /\d+x\d+\.(?:jpg|png|gif)$/i,   // Dimension-named files (often thumbs)
];

// Image file extensions
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|avif)$/i;

/**
 * Classify image tier based on URL analysis
 *
 * Since we can't fetch images at scrape time (too slow), we use URL heuristics:
 * - CDN patterns
 * - Image size hints in URL
 * - File naming conventions
 */
export function classifyImageTier(imageUrl?: string | null): ImageTier {
  if (!imageUrl || imageUrl.length < 10) return 'none';

  // Check for low-quality patterns
  if (LOW_QUALITY_PATTERNS.some(p => p.test(imageUrl))) {
    return 'none';
  }

  // Must have a valid image extension or be from a known CDN
  const hasValidExtension = IMAGE_EXTENSIONS.test(imageUrl);
  const isFromQualityCDN = QUALITY_CDNS.some(cdn => imageUrl.includes(cdn));

  if (!hasValidExtension && !isFromQualityCDN) {
    return 'none';
  }

  // Check for size hints in URL
  // Common patterns: _800x600, -large, /w/1200, width=1200
  const largeHints = /[-_](large|xl|full|hero|banner|wide)|[-_\/](1[0-9]{3}|[2-9]\d{3})x|width[=:](1[0-9]{3}|[2-9]\d{3})|\/w\/(1[0-9]{3}|[2-9]\d{3})/i;
  const mediumHints = /[-_](medium|md|standard|card)|[-_\/]([4-9]\d{2})x|width[=:]([4-9]\d{2})|\/w\/([4-9]\d{2})/i;
  const smallHints = /[-_](small|sm|thumb|tiny)|[-_\/]([1-3]\d{2})x|width[=:]([1-3]\d{2})|\/w\/([1-3]\d{2})/i;

  // Quality CDNs with no small hints → assume hero
  if (isFromQualityCDN && !smallHints.test(imageUrl)) {
    return 'hero';
  }

  // Explicit large hints → hero
  if (largeHints.test(imageUrl)) {
    return 'hero';
  }

  // Medium hints or quality CDN with no size info → card
  if (mediumHints.test(imageUrl) || isFromQualityCDN) {
    return 'card';
  }

  // Small hints → none (not usable)
  if (smallHints.test(imageUrl)) {
    return 'none';
  }

  // Default: assume card quality if it looks like a real image
  return hasValidExtension ? 'card' : 'none';
}

/**
 * Determine image source based on URL patterns
 */
export function determineImageSource(imageUrl?: string | null, event?: RawEvent | IRLEvent): ImageSource {
  if (!imageUrl || imageUrl.length < 10) return 'none';

  // Event-specific sources (flyers, posters)
  if (/flyer|poster|event[-_]?image|event[-_]?photo/i.test(imageUrl)) {
    return 'event';
  }

  // Venue images
  if (/venue|location|place|restaurant|bar|club/i.test(imageUrl)) {
    return 'venue';
  }

  // Organizer images
  if (/organizer|host|profile|avatar/i.test(imageUrl)) {
    return 'organizer';
  }

  // Stock images
  if (/unsplash|pexels|pixabay|stock|generic/i.test(imageUrl)) {
    return 'stock';
  }

  // AI generated (rare, but possible)
  if (/generated|ai[-_]?image|dalle|midjourney/i.test(imageUrl)) {
    return 'generated';
  }

  // Default to event source if from a ticketing platform
  if (QUALITY_CDNS.some(cdn => imageUrl.includes(cdn))) {
    return 'event';
  }

  // If we have event context, try to infer
  if (event) {
    const sourceName = ('sourceName' in event ? event.sourceName : event.source?.name) || '';
    if (/dice|ra|eventbrite|luma|fever/i.test(sourceName)) {
      return 'event';
    }
  }

  return 'event'; // Default assumption
}

/**
 * Build a prompt for AI image generation based on event data
 *
 * Use this when an event has no image or needs a higher quality image.
 * The prompt should be passed to an image generation API like DALL-E or Midjourney.
 */
export function buildImagePrompt(event: RawEvent | IRLEvent): string {
  const category = event.category;
  const tags = event.tags || [];
  const venueName = event.venueName || '';
  const neighborhood = event.neighborhood || 'Miami';
  const isOutdoor = event.isOutdoor;
  const title = event.title;

  // Base style for Miami aesthetic
  const style = 'vibrant, warm lighting, tropical, modern, editorial photography style';

  // Category-specific prompts
  const categoryPrompts: Record<string, string> = {
    Music: `Concert venue atmosphere, stage lighting, ${isOutdoor ? 'outdoor festival' : 'intimate club'}, crowd silhouettes, ${style}`,
    Art: `Art gallery interior, modern art exhibition, white walls, dramatic lighting, ${style}`,
    Culture: `Cultural performance space, diverse crowd, theatrical lighting, ${style}`,
    'Food & Drink': `${isOutdoor ? 'Outdoor dining patio' : 'Upscale restaurant interior'}, beautifully plated food, ambient lighting, ${style}`,
    Fitness: `${isOutdoor ? 'Outdoor fitness class on the beach' : 'Modern gym or yoga studio'}, active people, energetic, ${style}`,
    Wellness: `${isOutdoor ? 'Outdoor meditation session' : 'Spa or wellness center'}, peaceful, serene atmosphere, ${style}`,
    Sports: `Sports arena or stadium, energetic crowd, team colors, dynamic action, ${style}`,
    Comedy: `Comedy club interior, spotlight on stage, laughing audience, intimate venue, ${style}`,
    Nightlife: `${neighborhood} nightclub, neon lights, stylish crowd, DJ booth, ${style}`,
    Community: `${neighborhood} community gathering, diverse people, welcoming atmosphere, ${style}`,
    Outdoors: `${neighborhood} outdoor scene, palm trees, blue sky, waterfront or park, ${style}`,
    Family: `Family-friendly event, colorful, joyful, kid-friendly activities, ${style}`,
  };

  // Build the prompt
  let prompt = categoryPrompts[category] || `Miami ${category.toLowerCase()} event, ${style}`;

  // Add neighborhood flavor
  const neighborhoodVibes: Record<string, string> = {
    Wynwood: 'street art murals, creative energy, industrial-chic',
    Brickell: 'urban skyline, modern architecture, upscale',
    'South Beach': 'Art Deco buildings, ocean view, beach vibes',
    'Design District': 'luxury boutiques, contemporary design, sophisticated',
    'Little Havana': 'Cuban culture, vintage cars, domino tables, colorful',
    'Little Haiti': 'Caribbean art, vibrant colors, cultural heritage',
    'Coconut Grove': 'lush greenery, bohemian, waterfront',
    'Coral Gables': 'Mediterranean architecture, elegant, tree-lined streets',
    'Downtown Miami': 'urban energy, skyscrapers, bustling streets',
  };

  const hoodVibe = neighborhoodVibes[neighborhood];
  if (hoodVibe) {
    prompt += `, ${hoodVibe}`;
  }

  // Add tag-specific elements
  const tagPrompts: Record<string, string> = {
    'live-music': 'live band performing',
    dj: 'DJ spinning records',
    'happy-hour': 'cocktails and conversation',
    brunch: 'brunch table setting',
    rooftop: 'rooftop terrace with city views',
    waterfront: 'waterfront views, marina',
    beach: 'sandy beach, ocean waves',
    sunset: 'golden hour lighting, sunset colors',
    latin: 'Latin music and dance',
    jazz: 'jazz musicians, smoky atmosphere',
  };

  for (const tag of tags) {
    if (tagPrompts[tag]) {
      prompt += `, ${tagPrompts[tag]}`;
      break; // Only add one tag element to avoid prompt overload
    }
  }

  // Add venue hint if specific
  if (venueName && venueName.length > 3) {
    const venueHints: Record<string, string> = {
      'Club Space': 'underground techno club, warehouse aesthetic',
      'PAMM': 'modern museum architecture, Biscayne Bay views',
      'Wynwood Walls': 'colorful street art murals',
      'Faena': 'luxury hotel, artistic decor, gilded details',
      'The Ground': 'intimate underground venue',
      'Lagniappe': 'cozy wine bar, live jazz',
    };
    for (const [key, hint] of Object.entries(venueHints)) {
      if (venueName.includes(key)) {
        prompt += `, ${hint}`;
        break;
      }
    }
  }

  // Final formatting
  prompt += ', high quality, professional photography, 16:9 aspect ratio';

  return prompt;
}

/**
 * Enrich event with image classification data
 */
export function classifyEventImage(event: RawEvent | IRLEvent): {
  imageTier: ImageTier;
  imageSource: ImageSource;
  imagePrompt?: string;
} {
  const imageUrl = event.image;
  const imageTier = classifyImageTier(imageUrl);
  const imageSource = determineImageSource(imageUrl, event);

  // Generate prompt if no image or low tier
  const imagePrompt = imageTier === 'none' ? buildImagePrompt(event) : undefined;

  return {
    imageTier,
    imageSource: imageTier === 'none' ? 'none' : imageSource,
    imagePrompt,
  };
}

/**
 * Get statistics about image quality in a batch of events
 */
export function getImageStats(events: (RawEvent | IRLEvent)[]): {
  total: number;
  hero: number;
  card: number;
  none: number;
  bySource: Record<ImageSource, number>;
  needsGeneration: number;
} {
  const stats = {
    total: events.length,
    hero: 0,
    card: 0,
    none: 0,
    bySource: {
      event: 0,
      venue: 0,
      organizer: 0,
      stock: 0,
      generated: 0,
      none: 0,
    } as Record<ImageSource, number>,
    needsGeneration: 0,
  };

  for (const event of events) {
    const { imageTier, imageSource } = classifyEventImage(event);

    if (imageTier === 'hero') stats.hero++;
    else if (imageTier === 'card') stats.card++;
    else stats.none++;

    stats.bySource[imageSource]++;

    if (imageTier === 'none') {
      stats.needsGeneration++;
    }
  }

  return stats;
}
