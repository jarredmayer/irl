/**
 * Generates all PWA icon sizes from an SVG template using sharp.
 * Run: node scripts/gen-icons.mjs
 */
import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dir, '../public/icons');

// Icon design: bold "IRL" wordmark on sky-500 background with a subtle
// spark/dot accent — clean, readable at any size, distinctive on home screen.
function svg(size) {
  const pad = size * 0.1;
  const r = size * 0.22; // corner radius

  // Scale text to fit — the wordmark is the hero
  const fontSize = size * 0.365;
  const cx = size / 2;
  const cy = size / 2;

  // Accent dot (top-right) — mimics a notification/location ping
  const dotR = size * 0.072;
  const dotX = size * 0.76;
  const dotY = size * 0.24;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0ea5e9"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="dot" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#bg)"/>

  <!-- Wordmark -->
  <text
    x="${cx}"
    y="${cy + fontSize * 0.36}"
    font-family="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
    font-weight="900"
    font-size="${fontSize}"
    letter-spacing="${size * -0.01}"
    text-anchor="middle"
    fill="white"
  >IRL</text>

  <!-- Accent dot (amber/yellow — pops against sky blue) -->
  <circle cx="${dotX}" cy="${dotY}" r="${dotR}" fill="url(#dot)"/>
</svg>`;
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  const svgBuf = Buffer.from(svg(size));
  await sharp(svgBuf)
    .resize(size, size)
    .png()
    .toFile(join(outDir, `icon-${size}.png`));
  console.log(`✓ icon-${size}.png`);
}

// Also update the root favicon.svg
const faviconSvg = svg(32);
writeFileSync(join(__dir, '../public/favicon.svg'), svg(64));
console.log('✓ favicon.svg');
