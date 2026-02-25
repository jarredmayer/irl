/**
 * Generates PWA icon PNGs using only Node.js built-ins (zlib + fs).
 * No external dependencies required.
 * Run: node scripts/generate-icons.mjs
 *
 * NOTE: These are placeholder icons with a sky-blue→violet gradient.
 * Replace with professionally designed artwork before launch.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dir, '..', 'public');
const iconsDir = join(publicDir, 'icons');
mkdirSync(iconsDir, { recursive: true });

// CRC32 table
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcData = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

/**
 * Generate a PNG with:
 * - Sky-blue (#0ea5e9) to violet (#8b5cf6) diagonal gradient
 * - Rounded corners (20% radius)
 * - White "IRL" dot pattern at center (simple 3-dot pixel art for small sizes)
 */
function generateIconPNG(size) {
  // Brand colors
  const c1 = { r: 14, g: 165, b: 233 };   // sky-500
  const c2 = { r: 139, g: 92, b: 246 };   // violet-500

  // Pixels: RGBA
  const pixels = new Uint8Array(size * size * 4);

  const cornerRadius = size * 0.20;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Gradient t from top-left (0) to bottom-right (1)
      const t = (x + y) / (size * 2 - 2);
      const r = Math.round(c1.r + (c2.r - c1.r) * t);
      const g = Math.round(c1.g + (c2.g - c1.g) * t);
      const b = Math.round(c1.b + (c2.b - c1.b) * t);

      // Rounded corner mask using distance-to-corner
      const cx = Math.min(x, size - 1 - x);
      const cy = Math.min(y, size - 1 - y);
      let alpha = 255;
      if (cx < cornerRadius && cy < cornerRadius) {
        const dx = cornerRadius - cx;
        const dy = cornerRadius - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > cornerRadius) {
          alpha = 0;
        } else if (dist > cornerRadius - 1) {
          alpha = Math.round(255 * (cornerRadius - dist));
        }
      }

      // "IRL" — simple bold letterforms drawn in pixel art at center
      // Scale letterforms to icon size
      const scale = size / 192;
      const lx = Math.round(x / scale);
      const ly = Math.round(y / scale);
      const cx192 = 96, cy192 = 96;
      const letterW = 50, letterH = 60;
      // Letter pixel art on a 192px canvas grid
      const inLetter = isIRL(lx - cx192, ly - cy192, letterW, letterH);
      if (inLetter && alpha > 0) {
        pixels[idx] = 255;
        pixels[idx + 1] = 255;
        pixels[idx + 2] = 255;
        pixels[idx + 3] = alpha;
      } else {
        pixels[idx] = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
        pixels[idx + 3] = alpha;
      }
    }
  }

  // Build PNG: RGBA, 8-bit
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT: filter byte (0=None) + RGBA row data
  const rowSize = 1 + size * 4;
  const raw = Buffer.alloc(size * rowSize);
  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const srcIdx = (y * size + x) * 4;
      const dstIdx = y * rowSize + 1 + x * 4;
      raw[dstIdx] = pixels[srcIdx];
      raw[dstIdx + 1] = pixels[srcIdx + 1];
      raw[dstIdx + 2] = pixels[srcIdx + 2];
      raw[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }

  const compressed = deflateSync(raw, { level: 6 });

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Pixel-art "IRL" letterform check.
 * dx, dy are offsets from center on a 192px canvas.
 * Returns true if the pixel is part of the white lettering.
 */
function isIRL(dx, dy, _w, _h) {
  // Simple block letters, each ~12px wide × 40px tall on 192 canvas
  // I: centered block
  // R: left block + bump
  // L: left block + bottom serif

  const thick = 9;   // stroke thickness
  const h = 42;      // letter height
  const top = -h / 2;
  const bot = h / 2;

  // Horizontal spread: I at -26..−14, R at -6..+12, L at +17..+28
  const iy = dy >= top && dy <= bot;

  // --- I ---
  if (dx >= -29 && dx <= -17 && iy) return true;

  // --- R ---
  // Vertical stroke
  if (dx >= -10 && dx <= -2 && iy) return true;
  // Top bar
  if (dx >= -10 && dx <= +12 && dy >= top && dy <= top + thick) return true;
  // Mid bar
  if (dx >= -10 && dx <= +12 && dy >= -3 && dy <= -3 + thick) return true;
  // Upper bump (right side of R, top half)
  if (dx >= +4 && dx <= +12 && dy >= top && dy <= -3 + thick) return true;
  // Leg (diagonal, simplified as rectangle)
  if (dx >= +2 && dx <= +12 && dy >= -3 && dy <= bot && dx >= -3 + (dy + 3) * 0.4) return true;

  // --- L ---
  // Vertical stroke
  if (dx >= 14 && dx <= 22 && iy) return true;
  // Bottom foot
  if (dx >= 14 && dx <= 30 && dy >= bot - thick && dy <= bot) return true;

  return false;
}

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const APPLE_SIZE = 180;

for (const size of SIZES) {
  const png = generateIconPNG(size);
  writeFileSync(join(iconsDir, `icon-${size}.png`), png);
  console.log(`✓ icons/icon-${size}.png  (${png.length} bytes)`);
}

const applePng = generateIconPNG(APPLE_SIZE);
writeFileSync(join(publicDir, 'apple-touch-icon.png'), applePng);
console.log(`✓ apple-touch-icon.png  (${applePng.length} bytes)`);

console.log('\nDone. Placeholder icons generated — replace with designed artwork before launch.');
