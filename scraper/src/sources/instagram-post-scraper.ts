/**
 * Instagram Post Scraper
 *
 * Fetches real Instagram posts from accounts and uses Claude to extract
 * event data from captions and flyer images.
 *
 * Requires INSTAGRAM_SESSION_ID env var (sessionid cookie from a logged-in browser).
 * If not set, attempts unauthenticated fetch which may be blocked by Instagram.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { RawEvent } from '../types.js';

// Miami/FLL city-center fallback coords when venue not recognized
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  'Miami': { lat: 25.7617, lng: -80.1918 },
  'Fort Lauderdale': { lat: 26.1224, lng: -80.1373 },
};

export interface IGPost {
  caption: string;
  timestamp: number; // unix
  imageUrl?: string;
  postUrl?: string;
}

export interface IGAccountConfig {
  handle: string;
  city: 'Miami' | 'Fort Lauderdale';
  /** Approximate location hint to help Claude geocode events */
  locationHint?: string;
}

function getAnthropicClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');
  return new Anthropic({ apiKey: key });
}

/**
 * Fetch recent posts for a public Instagram account.
 * Uses Instagram's internal API endpoint with optional session cookie.
 */
export async function fetchIGPosts(handle: string, limit = 12): Promise<IGPost[]> {
  const sessionId = process.env.INSTAGRAM_SESSION_ID;

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'X-IG-App-ID': '936619743392459',
    'Referer': 'https://www.instagram.com/',
    'Origin': 'https://www.instagram.com',
  };

  if (sessionId) {
    headers['Cookie'] = `sessionid=${sessionId}; ig_did=placeholder;`;
  }

  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${handle}`;

  const resp = await fetch(url, { headers });

  if (!resp.ok) {
    throw new Error(`Instagram API returned ${resp.status} for @${handle}`);
  }

  const data = await resp.json() as any;
  const edges: any[] = data?.data?.user?.edge_owner_to_timeline_media?.edges ?? [];

  return edges.slice(0, limit).map((e: any) => ({
    caption: e.node.edge_media_to_caption?.edges?.[0]?.node?.text ?? '',
    timestamp: e.node.taken_at_timestamp ?? 0,
    imageUrl: e.node.display_url,
    postUrl: `https://www.instagram.com/p/${e.node.shortcode}/`,
  }));
}

/**
 * Use Claude to extract events from a batch of post captions.
 * Caption-only — fast and cheap (Haiku).
 */
async function extractEventsFromCaptions(
  client: Anthropic,
  account: IGAccountConfig,
  posts: IGPost[]
): Promise<Partial<RawEvent>[]> {
  const today = new Date().toISOString().slice(0, 10);
  const recentPosts = posts.filter(p => {
    const ageSeconds = Date.now() / 1000 - p.timestamp;
    return ageSeconds < 45 * 24 * 3600; // 45 days
  });

  const captionsWithLinks = recentPosts
    .map((p, i) => `[Post ${i + 1}]${p.postUrl ? ` ${p.postUrl}` : ''}\n${p.caption}`)
    .filter(c => c.trim().length > 20);

  if (!captionsWithLinks.length) return [];

  const prompt = `Extract upcoming events from these Instagram captions for a ${account.city} events app.
Account: @${account.handle}${account.locationHint ? `\nLocation context: ${account.locationHint}` : ''}
Today: ${today}

${captionsWithLinks.join('\n\n---\n\n')}

Return ONLY a JSON array of upcoming events (start date >= today). Skip past events, vague posts, or pure promotional content with no date.

Schema:
[{
  "title": string,
  "date": "YYYY-MM-DD",
  "time": "HH:MM" | null,
  "venue": string | null,
  "address": string | null,
  "neighborhood": string | null,
  "description": string,
  "price": number,
  "tags": string[],
  "category": "Music"|"Art"|"Food & Drink"|"Fitness"|"Community"|"Culture"|"Nightlife"|"Wellness"|"Sports",
  "sourcePostUrl": string | null
}]

Return [] if nothing concrete found. JSON only, no explanation.`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    return JSON.parse(match[0]);
  } catch {
    return [];
  }
}

/**
 * Use Claude vision to extract events from an image post (flyers, posters).
 * Only called when caption is short/empty and image likely contains event info.
 */
async function extractEventsFromImage(
  client: Anthropic,
  account: IGAccountConfig,
  post: IGPost
): Promise<Partial<RawEvent>[]> {
  if (!post.imageUrl) return [];

  const today = new Date().toISOString().slice(0, 10);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'url', url: post.imageUrl },
        },
        {
          type: 'text',
          text: `This is an Instagram post image from @${account.handle} in ${account.city}.
Today is ${today}. Is this an event flyer or poster with a concrete upcoming date?

If yes, return a JSON array with the event(s). If not an event flyer, return [].

Schema: [{ "title": string, "date": "YYYY-MM-DD", "time": "HH:MM"|null, "venue": string|null, "address": string|null, "neighborhood": string|null, "description": string, "price": number, "tags": string[], "category": string }]

JSON only.`,
        },
      ],
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];

  try {
    return JSON.parse(match[0]);
  } catch {
    return [];
  }
}

function toRawEvent(
  account: IGAccountConfig,
  extracted: Partial<RawEvent> & Record<string, any>
): RawEvent | null {
  if (!extracted.date || !extracted.title) return null;

  const today = new Date().toISOString().slice(0, 10);
  if (extracted.date < today) return null;

  const fallback = CITY_COORDS[account.city];

  return {
    title: extracted.title,
    startAt: `${extracted.date}T${extracted.time ?? '12:00'}:00`,
    venueName: extracted.venue ?? `@${account.handle}`,
    address: extracted.address ?? `${account.city}, FL`,
    neighborhood: extracted.neighborhood ?? '',
    lat: fallback.lat,
    lng: fallback.lng,
    city: account.city,
    tags: extracted.tags ?? [],
    category: extracted.category ?? 'Community',
    priceLabel: (extracted.price ?? 0) === 0 ? 'Free' : (extracted.price < 20 ? '$' : '$$'),
    priceAmount: extracted.price ?? 0,
    isOutdoor: (extracted.tags ?? []).some((t: string) =>
      ['outdoor', 'beach', 'park', 'waterfront'].includes(t)
    ),
    description: extracted.description ?? '',
    sourceUrl: extracted.sourcePostUrl ?? `https://www.instagram.com/${account.handle}/`,
    sourceName: `@${account.handle}`,
    recurring: false,
  };
}

/**
 * Scrape a single Instagram account and return extracted RawEvents.
 */
export async function scrapeIGAccount(account: IGAccountConfig): Promise<RawEvent[]> {
  const client = getAnthropicClient();

  const posts = await fetchIGPosts(account.handle);
  if (!posts.length) return [];

  const results: RawEvent[] = [];

  // Caption extraction (all posts in one batch)
  const fromCaptions = await extractEventsFromCaptions(client, account, posts);
  for (const e of fromCaptions) {
    const raw = toRawEvent(account, e);
    if (raw) results.push(raw);
  }

  // Vision extraction for posts with short/empty captions (likely flyers)
  const flyerPosts = posts.filter(p => p.caption.trim().length < 60 && p.imageUrl);
  for (const post of flyerPosts.slice(0, 4)) { // cap at 4 vision calls per account
    const fromImage = await extractEventsFromImage(client, account, post);
    for (const e of fromImage) {
      const raw = toRawEvent(account, e);
      if (raw) results.push(raw);
    }
  }

  return results;
}
