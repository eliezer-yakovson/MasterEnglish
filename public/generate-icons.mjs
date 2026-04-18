/**
 * generate-icons.mjs
 * Generates PWA PNG icons (192x192 and 512x512) using only Node.js built-ins.
 * Run: node public/generate-icons.mjs
 */
import { writeFileSync } from "fs";
import { deflateSync } from "zlib";

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(d.length, 0);
  const crc = Buffer.allocUnsafe(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, d])), 0);
  return Buffer.concat([len, t, d, crc]);
}

function makePNG(size) {
  // Indigo #6366f1 background with a lighter "ME" text hint via brightness
  const BG_R = 99, BG_G = 102, BG_B = 241; // #6366f1

  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0); // PNG filter byte: None
    for (let x = 0; x < size; x++) {
      // Rounded rectangle — corner radius 22% of size
      const r = size * 0.22;
      const dx = Math.max(r - x - 0.5, 0, x + 0.5 - (size - r));
      const dy = Math.max(r - y - 0.5, 0, y + 0.5 - (size - r));
      const inside = dx * dx + dy * dy <= r * r;

      if (!inside) {
        // Outside rounded rect → white (matches HTML background)
        raw.push(255, 255, 255);
      } else {
        // Simple "M" shape in light tint to give the icon character
        const nx = x / size; // 0..1
        const ny = y / size; // 0..1
        // Draw a white horizontal stripe as a letterform hint in the center
        const cx = Math.abs(nx - 0.5);
        const cy = Math.abs(ny - 0.5);
        const isLetter =
          (cx < 0.06 && cy < 0.22) || // two vertical bars
          (cx < 0.22 && cy < 0.06 && nx > 0.28 && nx < 0.72); // top horizontal
        raw.push(
          isLetter ? 220 : BG_R,
          isLetter ? 221 : BG_G,
          isLetter ? 255 : BG_B,
        );
      }
    }
  }

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB color type
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = deflateSync(Buffer.from(raw), { level: 6 });

  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync(new URL("icon-192.png", import.meta.url), makePNG(192));
writeFileSync(new URL("icon-512.png", import.meta.url), makePNG(512));
console.log("PWA icons generated: icon-192.png, icon-512.png");
