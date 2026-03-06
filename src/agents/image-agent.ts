/**
 * Image Generation Agent (Tier 2 Images)
 *
 * Generates or selects images for events that have no real photo.
 * Uses the generation_prompt from Phase 4 image classifier.
 *
 * Priority:
 * 1. Replicate API (FLUX Schnell model) - if REPLICATE_API_KEY set
 * 2. Fal.ai API (FLUX Schnell) - if FAL_API_KEY set
 * 3. Curated Unsplash fallback - organized by category
 *
 * Never blocks rendering - images load progressively.
 */

import { getCategoryImageByEventId } from '../data/category-images';
import type { Event } from '../types';

// Cache for generated images to avoid re-generation
const IMAGE_CACHE_KEY = 'irl_generated_images';

interface ImageCache {
  [eventId: string]: {
    url: string;
    generatedAt: number;
    source: 'replicate' | 'fal' | 'unsplash';
  };
}

interface GeneratedImage {
  url: string;
  source: 'replicate' | 'fal' | 'unsplash';
  eventId: string;
}

/**
 * Load image cache from localStorage
 */
function loadImageCache(): ImageCache {
  try {
    const cached = localStorage.getItem(IMAGE_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

/**
 * Save image cache to localStorage
 */
function saveImageCache(cache: ImageCache): void {
  try {
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    console.warn('Failed to save image cache');
  }
}

/**
 * Get cached image for an event
 */
export function getCachedImage(eventId: string): string | null {
  const cache = loadImageCache();
  const entry = cache[eventId];

  if (!entry) return null;

  // Images are valid for 7 days
  const TTL = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - entry.generatedAt > TTL) {
    delete cache[eventId];
    saveImageCache(cache);
    return null;
  }

  return entry.url;
}

/**
 * Cache a generated image
 */
function cacheImage(
  eventId: string,
  url: string,
  source: 'replicate' | 'fal' | 'unsplash'
): void {
  const cache = loadImageCache();
  cache[eventId] = {
    url,
    generatedAt: Date.now(),
    source,
  };
  saveImageCache(cache);
}

/**
 * Generate image using Replicate API (FLUX 1.1 Pro)
 * Using pro model for better editorial aesthetic quality
 */
async function generateWithReplicate(prompt: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_REPLICATE_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'black-forest-labs/flux-1.1-pro',
        input: {
          prompt,
          num_outputs: 1,
          aspect_ratio: '16:9',
          output_format: 'webp',
          output_quality: 90,
          num_inference_steps: 28,
          guidance_scale: 3.5,
        },
      }),
    });

    if (!response.ok) {
      console.warn('Replicate API error:', response.status);
      return null;
    }

    const prediction = await response.json();

    // Poll for completion (FLUX Schnell is fast, usually <10s)
    let result = prediction;
    let attempts = 0;
    const maxAttempts = 30;

    while (
      result.status !== 'succeeded' &&
      result.status !== 'failed' &&
      attempts < maxAttempts
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pollResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: { Authorization: `Token ${apiKey}` },
        }
      );

      result = await pollResponse.json();
      attempts++;
    }

    if (result.status === 'succeeded' && result.output?.[0]) {
      return result.output[0];
    }

    return null;
  } catch (error) {
    console.error('Replicate generation error:', error);
    return null;
  }
}

/**
 * Generate image using Fal.ai API (FLUX Pro)
 * Using pro model for better editorial aesthetic quality
 */
async function generateWithFal(prompt: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_FAL_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      'https://fal.run/fal-ai/flux-pro/v1.1',
      {
        method: 'POST',
        headers: {
          Authorization: `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          image_size: 'landscape_16_9',
          num_inference_steps: 28,
          guidance_scale: 3.5,
          num_images: 1,
          enable_safety_checker: true,
        }),
      }
    );

    if (!response.ok) {
      console.warn('Fal.ai API error:', response.status);
      return null;
    }

    const result = await response.json();

    if (result.images?.[0]?.url) {
      return result.images[0].url;
    }

    return null;
  } catch (error) {
    console.error('Fal.ai generation error:', error);
    return null;
  }
}

/**
 * Get Unsplash fallback image for an event
 */
function getUnsplashFallback(event: Event): string {
  return getCategoryImageByEventId(event.category, event.id);
}

/**
 * Generate or select an image for a single event
 */
export async function generateEventImage(
  event: Event,
  prompt?: string
): Promise<GeneratedImage> {
  // Check cache first
  const cached = getCachedImage(event.id);
  if (cached) {
    return {
      url: cached,
      source: 'unsplash', // We don't track source in cache, default to unsplash
      eventId: event.id,
    };
  }

  const generationPrompt =
    prompt || buildDefaultPrompt(event);

  // Try Replicate first
  const replicateImage = await generateWithReplicate(generationPrompt);
  if (replicateImage) {
    cacheImage(event.id, replicateImage, 'replicate');
    return {
      url: replicateImage,
      source: 'replicate',
      eventId: event.id,
    };
  }

  // Try Fal.ai second
  const falImage = await generateWithFal(generationPrompt);
  if (falImage) {
    cacheImage(event.id, falImage, 'fal');
    return {
      url: falImage,
      source: 'fal',
      eventId: event.id,
    };
  }

  // Fall back to Unsplash
  const unsplashUrl = getUnsplashFallback(event);
  cacheImage(event.id, unsplashUrl, 'unsplash');
  return {
    url: unsplashUrl,
    source: 'unsplash',
    eventId: event.id,
  };
}

/**
 * Generate images for multiple events (non-blocking)
 * Returns immediately with fallback URLs, updates cache in background
 */
export function generateEventImages(
  events: Event[]
): Map<string, string> {
  const results = new Map<string, string>();

  for (const event of events) {
    // Return fallback immediately
    const cached = getCachedImage(event.id);
    if (cached) {
      results.set(event.id, cached);
    } else {
      // Use Unsplash fallback immediately
      results.set(event.id, getUnsplashFallback(event));

      // Generate better image in background (don't await)
      generateEventImage(event).catch(console.error);
    }
  }

  return results;
}

/**
 * Build a default image generation prompt for an event
 * (Used when no prompt is stored on the event)
 * Uses Quartr-style editorial aesthetic
 */
function buildDefaultPrompt(event: Event): string {
  const timeOfDay = getTimeOfDay(event.startAt);
  const categoryStyle = getCategoryStyle(event.category);

  // Combine category style with time of day context and global suffix
  return `${categoryStyle}, ${timeOfDay} atmosphere, ${event.neighborhood} Miami mood. ${GLOBAL_STYLE_SUFFIX}`;
}

/**
 * Get time of day description from event start time
 */
function getTimeOfDay(startAt: string): string {
  const date = new Date(startAt);
  const hour = date.getHours();

  if (hour >= 5 && hour < 10) return 'morning light';
  if (hour >= 10 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'golden hour';
  if (hour >= 20 && hour < 23) return 'evening';
  return 'late night';
}

/**
 * Global style suffix for all image generation prompts
 * Quartr-inspired editorial aesthetic
 */
const GLOBAL_STYLE_SUFFIX = `Shot on Hasselblad medium format film. Cinematic color grading. Rich shadows, not crushed. Editorial lifestyle magazine quality. No people. No text overlays. No logos. No UI elements. 16:9 landscape crop. High resolution.`;

/**
 * Quartr-style category prompts
 * Abstract, stylized, artistic imagery that REPRESENTS the subject
 * rather than literally depicting it.
 */
const CATEGORY_PROMPTS: Record<string, string> = {
  Nightlife: `abstract still life, crystal glassware with colored liquid refractions, warm amber backlight, smoke wisps, deep shadows, editorial product photography, medium format, cinematic grain`,

  Music: `abstract musical instruments as sculpture, brass textures close-up, shallow depth of field, warm tungsten light against deep blue-black, fine art photography, film grain`,

  Outdoors: `abstract botanical still life, tropical leaves casting graphic shadows, Biscayne Bay water texture, golden hour light through palms, editorial nature photography, oversaturated detail`,

  Art: `single sculptural ceramic object on marble surface, gallery negative space, raking light from left, editorial fine art photography, clean white to deep shadow gradient`,

  'Food & Drink': `overhead still life, artisan plated dish with negative space, linen napkin, single stem flower, warm natural window light, editorial food photography, film simulation`,

  Market: `painterly still life, cut tropical flowers in ceramic vessel, fresh produce arranged with intention, dappled morning light, editorial lifestyle photography, soft film grain`,

  Wellness: `abstract botanical close-up, morning mist, single lotus or tropical flower, soft diffused light, meditation space texture, fine art photography, breath and stillness`,

  Film: `abstract cinema: film grain texture enlarged, light leak through aged film strip, projection bokeh, editorial photograph, dark room aesthetic, silver gelatin print feel`,

  Community: `warm street-level architectural detail, Miami pastel stucco texture, afternoon shadow geometry, Art Deco ornament close-up, editorial urban photography, warm analog film`,

  Culture: `museum object detail, archaeological artifact texture, archival document fragment, warm amber museum light, editorial fine art photography, considered composition`,

  Comedy: `spotlight cone in dark space, vintage microphone chrome detail, velvet curtain texture, intimate venue atmosphere, theatrical lighting, editorial portrait style`,

  Sports: `athletic equipment as sculpture, stadium light flare, dynamic fabric motion blur, high contrast editorial sports photography, frozen energy`,

  Fitness: `morning light through gym window, athletic form abstraction, sweat droplet macro, determination energy, editorial fitness photography, warm natural tones`,

  Family: `playful primary colors, toy blocks arranged as sculpture, warm afternoon sunlight, joyful negative space, editorial lifestyle, soft nostalgic grain`,
};

/**
 * Get category-specific style description for prompts
 */
function getCategoryStyle(category: string): string {
  return (
    CATEGORY_PROMPTS[category] ||
    'Miami lifestyle abstract, warm tones, editorial photography, atmospheric still life'
  );
}

/**
 * Get image statistics for a batch of events
 */
export function getImageStats(events: Event[]): {
  withImage: number;
  needsGeneration: number;
  cached: number;
} {
  let withImage = 0;
  let needsGeneration = 0;
  let cached = 0;

  for (const event of events) {
    if (event.image) {
      withImage++;
    } else {
      needsGeneration++;
      if (getCachedImage(event.id)) {
        cached++;
      }
    }
  }

  return { withImage, needsGeneration, cached };
}

/**
 * Clear image cache (for testing)
 */
export function clearImageCache(): void {
  localStorage.removeItem(IMAGE_CACHE_KEY);
}
