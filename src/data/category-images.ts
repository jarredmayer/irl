/**
 * Curated Category Images
 *
 * High-quality Unsplash photos organized by event category.
 * Used as Tier 3 fallback when no event image exists and
 * AI generation is unavailable.
 *
 * Each photo ID is a real Unsplash photo that matches its category.
 * Format: photo-{id} from unsplash.com/photos/{id}
 *
 * TODO: Replace with generation API when keys available.
 * Review and replace any photos that look like generic stock.
 * Target aesthetic: Quartr-style abstract, editorial, cinematic still life.
 */

export const CATEGORY_IMAGES: Record<string, string[]> = {
  // Nightlife: stylized club/bar scenes, neon, city lights
  nightlife: [
    'photo-1533174072545-7a4b6ad7a6c3', // neon lights, bar scene
    'photo-1470229722913-7c0e2dbbafd3', // concert crowd silhouette
    'photo-1514525253161-7a46d19cd819', // dj booth lights
    'photo-1571266028243-e4733b0f0bb0', // cocktail bar moody
    'photo-1566737236500-c8ac43014a67', // club dance floor
  ],

  // Music: instruments, concert halls, intimate venues
  music: [
    'photo-1514320291840-2e0a9bf2a9ae', // concert stage lights
    'photo-1493225457124-a3eb161ffa5f', // live band performance
    'photo-1511671782779-c97d3d27a1d4', // guitar close-up
    'photo-1501612780327-45045538702b', // jazz club intimate
    'photo-1415201364774-f6f0bb35f28f', // vinyl records
  ],

  // Outdoor/Outdoors: nature, beaches, parks, Miami landscapes
  outdoor: [
    'photo-1559339352-11d035aa65de', // palm trees sunset
    'photo-1507525428034-b723cf961d3e', // beach scene
    'photo-1506905925346-21bda4d32df4', // scenic outdoor
    'photo-1501785888041-af3ef285b470', // golden hour nature
    'photo-1469854523086-cc02fe5d8800', // waterfront miami style
  ],
  outdoors: [
    'photo-1559339352-11d035aa65de',
    'photo-1507525428034-b723cf961d3e',
    'photo-1506905925346-21bda4d32df4',
    'photo-1501785888041-af3ef285b470',
    'photo-1469854523086-cc02fe5d8800',
  ],

  // Arts/Art: galleries, sculptures, exhibitions
  arts: [
    'photo-1561214115-f2f134cc4912', // modern art gallery
    'photo-1541961017774-22349e4a1262', // art exhibition
    'photo-1578301978693-85fa9c0320b9', // sculpture museum
    'photo-1544967082-d9d25d867d66', // gallery white walls
    'photo-1513364776144-60967b0f800f', // contemporary art
  ],
  art: [
    'photo-1561214115-f2f134cc4912',
    'photo-1541961017774-22349e4a1262',
    'photo-1578301978693-85fa9c0320b9',
    'photo-1544967082-d9d25d867d66',
    'photo-1513364776144-60967b0f800f',
  ],

  // Food & Drink: plated food, restaurants, dining
  'food & drink': [
    'photo-1414235077428-338989a2e8c0', // plated fine dining
    'photo-1504674900247-0877df9cc836', // food still life
    'photo-1517248135467-4c7edcad34c4', // restaurant interior
    'photo-1555396273-367ea4eb4db5', // brunch table
    'photo-1466978913421-dad2ebd01d17', // craft cocktail
  ],
  food: [
    'photo-1414235077428-338989a2e8c0',
    'photo-1504674900247-0877df9cc836',
    'photo-1517248135467-4c7edcad34c4',
    'photo-1555396273-367ea4eb4db5',
    'photo-1466978913421-dad2ebd01d17',
  ],

  // Market: farmers markets, produce, artisan goods
  market: [
    'photo-1488459716781-31db52582fe9', // farmers market produce
    'photo-1542838132-92c53300491e', // market stall
    'photo-1518843875459-f738682238a6', // artisan goods
    'photo-1506617420156-8e4536971650', // fresh produce
    'photo-1533900298318-6b8da08a523e', // flowers market
  ],

  // Wellness/Fitness: yoga, meditation, spa
  wellness: [
    'photo-1545205597-3d9d02c29597', // yoga serene
    'photo-1544367567-0f2fcb009e0b', // meditation peaceful
    'photo-1506126613408-eca07ce68773', // wellness spa
    'photo-1518611012118-696072aa579a', // fitness yoga
    'photo-1571019613454-1cb2f99b2d8b', // workout gym
  ],
  fitness: [
    'photo-1571019613454-1cb2f99b2d8b',
    'photo-1518611012118-696072aa579a',
    'photo-1534438327276-14e5300c3a48',
    'photo-1549060279-7e168fcee0c2',
    'photo-1517836357463-d25dfeac3438',
  ],

  // Film/Comedy: theaters, screens, stages
  film: [
    'photo-1489599849927-2ee91cede3ba', // cinema seats
    'photo-1517604931442-7e0c8ed2963c', // movie theater
    'photo-1524712245354-2c4e5e7121c0', // projection light
    'photo-1440404653325-ab127d49abc1', // film reels
    'photo-1536440136628-849c177e76a1', // theater seats
  ],
  comedy: [
    'photo-1585699324551-f6c309eedeca', // comedy club
    'photo-1516280440614-37939bbacd81', // stage microphone
    'photo-1503095396549-807759245b35', // comedy stage
    'photo-1493676304819-0d7a8d026dcf', // spotlight stage
  ],

  // Community: neighborhood scenes, gatherings
  community: [
    'photo-1529156069898-49953e39b3ac', // community gathering
    'photo-1517457373958-b7bdd4587205', // neighborhood street
    'photo-1559027615-cd4628902d4a', // friends gathering
    'photo-1511988617509-a57c8a288659', // community event
    'photo-1528605248644-14dd04022da1', // group celebration
  ],

  // Culture: museums, heritage, cultural events
  culture: [
    'photo-1564399579883-451a5d44ec08', // cultural heritage
    'photo-1551966775-a4ddc8df052b', // museum interior
    'photo-1518998053901-5348d3961a04', // cultural event
    'photo-1582555172866-f73bb12a2ab3', // traditional art
    'photo-1499781350541-7783f6c6a0c8', // historic building
  ],

  // Sports: games, athletics, stadiums
  sports: [
    'photo-1461896836934- voices', // stadium lights
    'photo-1508098682722-e99c43a406b2', // sports action
    'photo-1471295253337-3ceaaedca402', // athletic event
    'photo-1574629810360-7efbbe195018', // sports arena
    'photo-1546519638-68e109498ffc', // basketball
  ],

  // Family: kid-friendly, family activities
  family: [
    'photo-1536640712-4d4c36ff0e4e', // family fun
    'photo-1503454537195-1dcabb73ffb9', // kids playing
    'photo-1516627145497-ae6968895b74', // family outdoors
    'photo-1597524678053-5e6fef52d8a3', // family activities
  ],
};

/**
 * Get a random image URL for a category
 */
export function getCategoryImage(category: string): string {
  const normalizedCategory = category.toLowerCase();
  const images = CATEGORY_IMAGES[normalizedCategory];

  if (!images || images.length === 0) {
    // Fallback to community images for unknown categories
    const fallback = CATEGORY_IMAGES.community;
    const randomIndex = Math.floor(Math.random() * fallback.length);
    return buildUnsplashUrl(fallback[randomIndex]);
  }

  const randomIndex = Math.floor(Math.random() * images.length);
  return buildUnsplashUrl(images[randomIndex]);
}

/**
 * Get a deterministic image for a category based on event ID
 * (ensures same event always gets same image)
 */
export function getCategoryImageByEventId(
  category: string,
  eventId: string
): string {
  const normalizedCategory = category.toLowerCase();
  const images = CATEGORY_IMAGES[normalizedCategory] || CATEGORY_IMAGES.community;

  // Use event ID to deterministically select an image
  const hash = simpleHash(eventId);
  const index = hash % images.length;

  return buildUnsplashUrl(images[index]);
}

/**
 * Simple string hash for deterministic selection
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Build full Unsplash URL from photo ID
 */
function buildUnsplashUrl(photoId: string): string {
  // Remove 'photo-' prefix if present
  const id = photoId.replace('photo-', '');
  // Return optimized URL with reasonable dimensions
  return `https://images.unsplash.com/photo-${id}?w=800&h=600&fit=crop&auto=format`;
}

/**
 * Get all images for a category (for preloading)
 */
export function getAllCategoryImages(category: string): string[] {
  const normalizedCategory = category.toLowerCase();
  const images = CATEGORY_IMAGES[normalizedCategory] || CATEGORY_IMAGES.community;
  return images.map(buildUnsplashUrl);
}
