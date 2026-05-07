/**
 * Generates public/og-image.png — a 1200×630 social card.
 *
 * Zero dependencies. Builds a raw RGBA buffer, deflates it with the built-in
 * zlib, and emits a valid PNG. The visual is intentionally simple (warm paper
 * background, layered horizon bands) because real text rendering would require
 * a font/canvas dependency. Re-run after editing if the brand palette changes:
 *
 *   npx tsx scripts/generate-og-image.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const W = 1200;
const H = 630;
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "..", "public", "og-image.png");

type RGBA = readonly [number, number, number, number];

const PAPER: RGBA = [0xff, 0xfe, 0xfb, 0xff];
const INK: RGBA = [0xf5, 0xeb, 0xe3, 0xff];
const SLATE_1: RGBA = [0xdc, 0xcf, 0xbf, 0xff];
const SLATE_2: RGBA = [0xc9, 0xb8, 0xa4, 0xff];
const SLATE_3: RGBA = [0xa8, 0x94, 0x82, 0xff];
const STONE: RGBA = [0x5a, 0x4f, 0x47, 0xff];
const FROST: RGBA = [0x2e, 0x28, 0x22, 0xff];
const OCHRE: RGBA = [0xe8, 0x9b, 0x20, 0xff];

const stride = W * 4 + 1;
const raw = Buffer.alloc(stride * H);

function setPx(x: number, y: number, c: RGBA) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const off = y * stride + 1 + x * 4;
  raw[off] = c[0];
  raw[off + 1] = c[1];
  raw[off + 2] = c[2];
  raw[off + 3] = c[3];
}

function fillRect(x0: number, y0: number, x1: number, y1: number, c: RGBA) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) setPx(x, y, c);
}

// Filter byte = 0 (None) per scanline; warm paper background.
for (let y = 0; y < H; y++) {
  raw[y * stride] = 0;
  for (let x = 0; x < W; x++) setPx(x, y, PAPER);
}

// Subtle top vignette toward INK to anchor the title area.
for (let y = 0; y < 80; y++) {
  const t = 1 - y / 80;
  for (let x = 0; x < W; x++) {
    const r = Math.round(PAPER[0] * (1 - t * 0.04) + INK[0] * (t * 0.04));
    const g = Math.round(PAPER[1] * (1 - t * 0.04) + INK[1] * (t * 0.04));
    const b = Math.round(PAPER[2] * (1 - t * 0.04) + INK[2] * (t * 0.04));
    setPx(x, y, [r, g, b, 255]);
  }
}

// Layered horizon bands, back-to-front.
const ridges: Array<{ color: RGBA; line: (t: number) => number }> = [
  { color: INK, line: (t) => 240 + 18 * Math.sin(t * 7.1 + 0.4) + 10 * Math.sin(t * 13 + 1.2) },
  { color: SLATE_1, line: (t) => 320 + 26 * Math.sin(t * 5.3 + 1.7) + 14 * Math.sin(t * 11 + 0.6) },
  { color: SLATE_2, line: (t) => 400 + 32 * Math.sin(t * 4.1 + 2.2) + 18 * Math.sin(t * 9 + 0.1) },
  { color: SLATE_3, line: (t) => 470 + 22 * Math.sin(t * 3.3 + 0.8) + 12 * Math.sin(t * 8.7 + 1.9) },
  { color: STONE, line: (t) => 540 + 14 * Math.sin(t * 2.7 + 1.1) + 8 * Math.sin(t * 6 + 2.6) },
];
for (const ridge of ridges) {
  for (let x = 0; x < W; x++) {
    const t = x / W;
    const top = Math.round(ridge.line(t));
    for (let y = top; y < H; y++) setPx(x, y, ridge.color);
    setPx(x, top - 1, FROST);
  }
}

// Wordmark stand-in: a frost block where the title would sit + an ochre rule.
fillRect(80, 88, 240, 96, FROST);
fillRect(80, 168, 124, 172, OCHRE);

// Decorative pin cluster lower-right, evoking the explorer map.
const pins: Array<[number, number, number, RGBA]> = [
  [930, 360, 8, FROST],
  [1010, 410, 6, STONE],
  [1080, 350, 7, FROST],
  [970, 290, 5, OCHRE],
  [1100, 430, 5, STONE],
];
for (const [cx, cy, r, c] of pins) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setPx(x, y, c);
    }
  }
}

// PNG encoding.
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function crc32(b: Buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type: RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const idat = deflateSync(raw, { level: 9 });
const png = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, png);
process.stdout.write(`og-image.png written (${png.length} bytes)\n`);
