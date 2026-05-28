/**
 * Generates PWA / Apple touch / Android adaptive icon PNGs from a single
 * deterministic design. Zero external dependencies (no sharp, no canvas) —
 * builds raw RGBA buffers and emits valid PNGs via Node's built-in zlib.
 *
 * Emits (relative to /public):
 *   - icon-180.png         (Apple touch icon, iOS home screen)
 *   - icon-192.png         (Android adaptive icon, foreground)
 *   - icon-512.png         (PWA install splash + manifest large icon)
 *   - icon-512-maskable.png (Android maskable: safe-zone padded design)
 *
 * Design: dark navy paper background (matching public/favicon.svg) with
 * three terrain bands and a warm sun circle. Maskable variant insets the
 * artwork to ~80% so Android's circular / squircle / square masks never
 * crop the meaningful pixels.
 *
 * Re-run after editing if the brand palette changes:
 *
 *   npx tsx scripts/generate-icons.ts
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(HERE, "..", "public");

type RGBA = readonly [number, number, number, number];
type Px = (x: number, y: number) => RGBA;

const NAVY: RGBA = [0x0b, 0x12, 0x1c, 0xff];
const NAVY_HI: RGBA = [0x13, 0x1c, 0x2e, 0xff];
const BAND_A: RGBA = [0x8e, 0xc6, 0xd8, 0xff];
const BAND_B: RGBA = [0x4a, 0x62, 0x77, 0xff];
const BAND_C: RGBA = [0x35, 0x47, 0x59, 0xff];
const SUN: RGBA = [0xd9, 0xb3, 0x6a, 0xff];

interface IconOptions {
  size: number;
  /** Safe-zone inset (0..0.5) — leaves padding on every side for maskable
   *  icons so Android's various mask shapes can't crop the artwork. */
  inset?: number;
}

/** Compose a deterministic icon pixel function for a given size + inset. */
function iconAt(opts: IconOptions): Px {
  const { size, inset = 0 } = opts;
  const padding = Math.round(size * inset);
  const innerSize = size - padding * 2;
  const innerOriginX = padding;
  const innerOriginY = padding;
  // Sub-coordinates that scale the favicon 64x64 design to the icon's
  // inner content box.
  const scaleX = (x: number) => innerOriginX + (x / 64) * innerSize;
  const scaleY = (y: number) => innerOriginY + (y / 64) * innerSize;

  // Band centers (y) and amplitudes in 64-design space.
  const bands: Array<{ ymid: number; amp: number; freq: number; phase: number; color: RGBA; thickness: number }> = [
    { ymid: 46, amp: 6.5, freq: 0.55, phase: 0.2, color: BAND_A, thickness: 2.6 },
    { ymid: 52, amp: 5.5, freq: 0.5, phase: 0.7, color: BAND_B, thickness: 1.9 },
    { ymid: 58, amp: 4.5, freq: 0.45, phase: 1.3, color: BAND_C, thickness: 1.4 },
  ];

  const sunCenterX = 32;
  const sunCenterY = 24;
  const sunRadius = 3.6;

  // Soft glow gradient from top (NAVY_HI) to bottom (NAVY).
  return function pxAt(x, y) {
    // Mask outside the inset content box → background pure NAVY so any mask
    // crop on the outer ring keeps the brand colour visible.
    const ix = x - innerOriginX;
    const iy = y - innerOriginY;
    if (ix < 0 || iy < 0 || ix >= innerSize || iy >= innerSize) {
      return NAVY;
    }
    // 64x64 design space.
    const dx = (ix / innerSize) * 64;
    const dy = (iy / innerSize) * 64;

    // Background gradient.
    const tGrad = Math.min(1, Math.max(0, dy / 64));
    const bgR = Math.round(NAVY_HI[0] * (1 - tGrad) + NAVY[0] * tGrad);
    const bgG = Math.round(NAVY_HI[1] * (1 - tGrad) + NAVY[1] * tGrad);
    const bgB = Math.round(NAVY_HI[2] * (1 - tGrad) + NAVY[2] * tGrad);
    let r = bgR, g = bgG, b = bgB;

    // Terrain bands — anti-aliased by checking distance to a sinusoidal y(x).
    for (const band of bands) {
      const yLine = band.ymid + band.amp * Math.sin((dx / 12) + band.phase) * band.freq + band.amp * 0.4 * Math.sin((dx / 5) + band.phase * 2);
      const dyTo = dy - yLine;
      // Fill below the band line down to the next band's average for a layered look.
      const within = dyTo >= -band.thickness && dyTo <= 64 - band.ymid;
      const onLine = Math.abs(dyTo) <= band.thickness;
      if (within && onLine) {
        // Alpha-mix the band colour over the existing pixel.
        const alpha = Math.max(0, 1 - Math.abs(dyTo) / band.thickness);
        r = Math.round(r * (1 - alpha) + band.color[0] * alpha);
        g = Math.round(g * (1 - alpha) + band.color[1] * alpha);
        b = Math.round(b * (1 - alpha) + band.color[2] * alpha);
      }
    }

    // Sun circle (filled, with a slight feather).
    const sdx = dx - sunCenterX;
    const sdy = dy - sunCenterY;
    const sd = Math.sqrt(sdx * sdx + sdy * sdy);
    if (sd <= sunRadius + 0.6) {
      const alpha = sd <= sunRadius ? 1 : Math.max(0, 1 - (sd - sunRadius) / 0.6);
      r = Math.round(r * (1 - alpha) + SUN[0] * alpha);
      g = Math.round(g * (1 - alpha) + SUN[1] * alpha);
      b = Math.round(b * (1 - alpha) + SUN[2] * alpha);
    }

    return [r, g, b, 255];
  };
  // Reference the unused helpers so TS doesn't flag them; future variants
  // may swap to using scaleX/scaleY directly when the design grows.
  void scaleX; void scaleY;
}

function renderPng(size: number, px: Px): Buffer {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const off = y * stride + 1 + x * 4;
      const c = px(x, y);
      raw[off] = c[0];
      raw[off + 1] = c[1];
      raw[off + 2] = c[2];
      raw[off + 3] = c[3];
    }
  }
  return encodePng(size, size, raw);
}

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(width: number, height: number, raw: Buffer): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, pngChunk("IHDR", ihdr), pngChunk("IDAT", idat), pngChunk("IEND", Buffer.alloc(0))]);
}

interface Target {
  size: number;
  inset: number;
  filename: string;
}

const TARGETS: Target[] = [
  { size: 180, inset: 0, filename: "icon-180.png" },
  { size: 192, inset: 0, filename: "icon-192.png" },
  { size: 512, inset: 0, filename: "icon-512.png" },
  // Maskable safe zone: design takes ~80% of the icon, padding goes to the
  // bezel so Android's various mask shapes (circle / squircle / square /
  // rounded square) can't crop the meaningful pixels.
  { size: 512, inset: 0.1, filename: "icon-512-maskable.png" },
];

for (const target of TARGETS) {
  const px = iconAt({ size: target.size, inset: target.inset });
  const png = renderPng(target.size, px);
  const out = resolve(PUBLIC, target.filename);
  writeFileSync(out, png);
  process.stdout.write(`${target.filename} written (${png.length} bytes, ${target.size}×${target.size}, inset ${(target.inset * 100).toFixed(0)}%)\n`);
}
