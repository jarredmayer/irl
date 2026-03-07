// scripts/generate-category-images.mjs
// Run once: node scripts/generate-category-images.mjs
// Generates 8 editorial images per category, saves to public/images/category/

import { fal } from '@fal-ai/client';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '../public/images/category');
const MANIFEST_PATH = join(__dirname, '../src/data/category-images-manifest.json');

// ── YOUR KEY ──────────────────────────────────────────────
// Set in terminal before running:
// export FAL_KEY=your-fal-key-here
fal.config({ credentials: process.env.FAL_KEY });

// ── STYLE LOCK ────────────────────────────────────────────
// This is the Ohneis/Quartr aesthetic brief.
// Do not change this — it's what makes every image cohesive.
const STYLE = [
  'editorial brand photography',
  'single hero object centered or rule-of-thirds',
  'bold graphic composition',
  'rich saturated shadows deep blacks',
  'dramatic side or back lighting raking across subject',
  'medium format film aesthetic',
  'warm analog color grade',
  'fine texture detail',
  'considered negative space',
  'no people no faces no text no logos',
  'clean uncluttered background',
  'ultra sharp focus',
  'commercial lifestyle photography quality',
  'cinematic 16:9 landscape',
].join(', ');

// ── CATEGORY PROMPTS ──────────────────────────────────────
// 8 prompts per category — varied subjects, same aesthetic
const CATEGORIES = {
  nightlife: [
    'crystal whiskey glass with amber liquid single ice cube',
    'champagne bottle neck with condensation bubbles rising',
    'cocktail shaker polished steel dramatic back light',
    'neon sign reflection in a rain puddle abstract',
    'olive on cocktail pick close up macro',
    'leather bar stool detail stitching brass nail',
    'wine glass silhouette against dark window',
    'match flame igniting a candle extreme close up',
  ],
  music: [
    'brass trumpet bell close up warm patina',
    'vinyl record on turntable needle in groove macro',
    'guitar strings close up fretboard bokeh',
    'grand piano keys side angle dramatic shadow',
    'microphone chrome head extreme close up',
    'drum snare head with drumstick impact blur',
    'saxophone bell curve warm brass tones',
    'headphones on white marble dramatic shadow',
  ],
  outdoor: [
    'tropical bird of paradise flower macro side light',
    'ocean wave crest translucent backlit golden hour',
    'palm frond close up shadow pattern on sand',
    'kayak paddle dripping water drops macro',
    'mangrove roots water reflection abstract',
    'sunset over miami bay silhouette minimal',
    'coral detail underwater macro vibrant',
    'hammock rope detail woven texture bokeh',
  ],
  arts: [
    'ceramic vessel matte white dramatic side light',
    'paint brush tip loaded with oil paint macro',
    'gallery wall white plaster texture minimal',
    'sculpture hand fragment marble close up',
    'ink drop in water plume abstract',
    'canvas texture impasto thick paint close up',
    'art book open spine pages abstract',
    'pencil tip on paper drawing macro',
  ],
  food: [
    'single perfect scallop seared caramelized close up',
    'coffee espresso crema swirl macro overhead',
    'artisan bread crust cross section texture',
    'oyster shell half open on ice close up',
    'chocolate cake slice perfect cut dramatic light',
    'fresh pasta strands dusted flour macro',
    'citrus slice cross section backlit translucent',
    'chef knife blade macro steel reflection',
  ],
  community: [
    'handmade ceramic market goods arranged minimal',
    'vintage bicycle wheel chrome spokes bokeh',
    'farmers market produce arranged graphic overhead',
    'artisan leather goods folded texture close up',
    'typewriter keys close up dramatic angle',
    'vintage glass bottles arranged backlit',
    'woven basket texture close up warm tones',
    'potted succulent minimal white background',
  ],
  wellness: [
    'plumeria flower macro white petals yellow center',
    'smooth river stones stacked minimal',
    'essential oil bottle dropper macro amber glass',
    'linen fabric texture close up natural light',
    'bamboo steam spa minimal',
    'crystal clear water pour macro',
    'white orchid single stem minimal background',
    'wooden bowl with salt crystals macro',
  ],
  fitness: [
    'athletic shoe sole tread close up macro',
    'kettlebell handle chalk dust dramatic light',
    'resistance band loop minimal graphic',
    'pull up bar chalk handprint close up',
    'swim goggle lens reflection abstract',
    'cycling helmet vent pattern close up',
    'jump rope handles grip texture macro',
    'weight plate iron texture close up',
  ],
  culture: [
    'museum exhibit case glass reflection abstract',
    'old book spine leather gold lettering macro',
    'film reel strip close up light through frames',
    'theater curtain velvet texture deep red',
    'ancient coin macro texture patina',
    'map detail vintage paper texture close up',
    'chess piece marble knight close up',
    'antique pocket watch face macro',
  ],
  default: [
    'miami art deco building facade detail',
    'city light bokeh abstract warm tones',
    'modern architecture concrete texture close up',
    'glass building reflection clouds abstract',
    'street at golden hour empty minimal',
    'door handle brass patina close up macro',
    'window light pattern floor shadow abstract',
    'urban texture graffiti abstract crop',
  ],
};

// ── GENERATE ──────────────────────────────────────────────

async function generateImage(prompt, outputPath) {
  if (existsSync(outputPath)) {
    console.log(`  SKIP (exists): ${outputPath}`);
    return;
  }

  console.log(`  Generating: ${prompt.slice(0, 60)}...`);

  const result = await fal.subscribe('fal-ai/flux-pro/v1.1', {
    input: {
      prompt: `${prompt}, ${STYLE}`,
      image_size: 'landscape_16_9',
      num_images: 1,
      output_format: 'jpeg',
      safety_tolerance: '2',
    },
  });

  const imageUrl = result.data.images[0].url;

  // Download and save
  const res = await fetch(imageUrl);
  const buffer = await res.arrayBuffer();
  writeFileSync(outputPath, Buffer.from(buffer));
  console.log(`  Saved: ${outputPath}`);

  // Small delay to be polite to the API
  await new Promise(r => setTimeout(r, 500));
}

async function run() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const manifest = {};

  for (const [category, prompts] of Object.entries(CATEGORIES)) {
    console.log(`\nCategory: ${category} (${prompts.length} images)`);
    const catDir = join(OUTPUT_DIR, category);
    mkdirSync(catDir, { recursive: true });

    manifest[category] = [];

    for (let i = 0; i < prompts.length; i++) {
      const filename = `${i + 1}.jpg`;
      const outputPath = join(catDir, filename);
      const publicPath = `/images/category/${category}/${filename}`;

      try {
        await generateImage(prompts[i], outputPath);
        manifest[category].push(publicPath);
      } catch (err) {
        console.error(`  ERROR: ${err.message}`);
      }
    }
  }

  // Write manifest so the app knows what exists
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest written to ${MANIFEST_PATH}`);
  console.log('\nDone. Now run: git add -A && git commit -m "feat: category image set" && git push');
}

run();
