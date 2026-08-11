import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const publicDir = path.resolve(process.cwd(), "public");

// 1. Generate favicon.svg
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f2b3c" />
      <stop offset="50%" stop-color="#185e7b" />
      <stop offset="100%" stop-color="#207ba1" />
    </linearGradient>

    <linearGradient id="hatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffea75" />
      <stop offset="35%" stop-color="#ffd600" />
      <stop offset="100%" stop-color="#e69d00" />
    </linearGradient>

    <linearGradient id="brimGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffd600" />
      <stop offset="100%" stop-color="#c98200" />
    </linearGradient>

    <linearGradient id="roadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>

    <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#94a3b8" />
    </linearGradient>

    <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- Background Squircle Container -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />

  <!-- Technical Blueprint Grid Lines -->
  <path d="M 64 0 V 512 M 128 0 V 512 M 192 0 V 512 M 256 0 V 512 M 320 0 V 512 M 384 0 V 512 M 448 0 V 512" stroke="#ffffff" stroke-width="1" stroke-opacity="0.08" />
  <path d="M 0 64 H 512 M 0 128 H 512 M 0 192 H 512 M 0 256 H 512 M 0 320 H 512 M 0 384 H 512 M 0 448 H 512" stroke="#ffffff" stroke-width="1" stroke-opacity="0.08" />

  <!-- Gold Border Accent -->
  <rect x="16" y="16" width="480" height="480" rx="96" fill="none" stroke="#ffd600" stroke-width="6" stroke-opacity="0.4" />

  <g filter="url(#dropShadow)">
    <!-- Technical Measurement Ticks (Left & Right) -->
    <g stroke="#94a3b8" stroke-width="3" stroke-linecap="round" opacity="0.6">
      <line x1="44" y1="180" x2="68" y2="180" />
      <line x1="44" y1="210" x2="60" y2="210" />
      <line x1="44" y1="240" x2="60" y2="240" />
      <line x1="44" y1="270" x2="68" y2="270" />
      <line x1="44" y1="300" x2="60" y2="300" />
      <line x1="44" y1="330" x2="60" y2="330" />
      <line x1="44" y1="360" x2="68" y2="360" />

      <line x1="468" y1="180" x2="444" y2="180" />
      <line x1="468" y1="210" x2="452" y2="210" />
      <line x1="468" y1="240" x2="452" y2="240" />
      <line x1="468" y1="270" x2="444" y2="270" />
      <line x1="468" y1="300" x2="452" y2="300" />
      <line x1="468" y1="330" x2="452" y2="330" />
      <line x1="468" y1="360" x2="444" y2="360" />
    </g>

    <!-- Perspective Highway (Rodovia / Asfalto) -->
    <g>
      <path d="M 160 440 L 352 440 L 304 280 L 208 280 Z" fill="url(#roadGrad)" stroke="#475569" stroke-width="4" />
      <line x1="172" y1="440" x2="214" y2="280" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity="0.9" />
      <line x1="340" y1="440" x2="298" y2="280" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity="0.9" />
      <line x1="256" y1="440" x2="256" y2="280" stroke="#ffd600" stroke-width="8" stroke-dasharray="20,16" stroke-linecap="butt" />
    </g>

    <!-- Crossed Drafting Compass (Compasso de Engenharia) -->
    <g stroke="url(#metalGrad)" stroke-width="12" stroke-linecap="round" opacity="0.85">
      <line x1="140" y1="130" x2="330" y2="320" />
      <line x1="372" y1="130" x2="182" y2="320" />
      <circle cx="256" cy="120" r="14" fill="#185e7b" stroke="#f8fafc" stroke-width="6" />
    </g>

    <!-- Civil Engineering Hardhat (Capacete de Engenharia) -->
    <ellipse cx="256" cy="275" rx="145" ry="24" fill="#091e28" opacity="0.5" />
    <path d="M 130 260 C 130 140, 382 140, 382 260 Z" fill="url(#hatGrad)" />

    <!-- Hardhat Crest (Crista Central) -->
    <path d="M 238 145 C 238 135, 274 135, 274 145 L 280 262 L 232 262 Z" fill="#ffe766" />
    <path d="M 256 140 L 256 262" stroke="#ffffff" stroke-width="3" opacity="0.6" />

    <!-- Hardhat Shine Highlight -->
    <path d="M 160 240 C 160 175, 210 160, 230 156 C 210 170, 175 200, 172 245 Z" fill="#ffffff" opacity="0.35" />

    <!-- Hardhat Brim -->
    <path d="M 96 260 C 120 242, 392 242, 416 260 C 428 276, 84 276, 96 260 Z" fill="url(#brimGrad)" stroke="#b37d00" stroke-width="2" />
    <path d="M 90 268 C 120 282, 392 282, 422 268 C 410 284, 102 284, 90 268 Z" fill="#8c5e00" />

    <!-- DER Engineering Shield Badge -->
    <g transform="translate(256, 222)">
      <path d="M -24 -18 L 24 -18 L 24 6 C 24 20, 0 28, 0 28 C 0 28, -24 20, -24 6 Z" fill="#185e7b" stroke="#ffffff" stroke-width="3" />
      <path d="M 0 -10 L 3 -2 L 10 -2 L 4 3 L 6 10 L 0 5 L -6 10 L -4 3 L -10 -2 L -3 -2 Z" fill="#ffd600" />
    </g>
  </g>
</svg>
`;

fs.writeFileSync(path.join(publicDir, "favicon.svg"), svgContent, "utf-8");
console.log("Created public/favicon.svg");

// 2. Pure JS Rasterizer for PNG & ICO generation
function distToSquircle(px, py, rx) {
  // px in [-0.5, 0.5], py in [-0.5, 0.5]
  const cornerR = 0.22;
  const innerHalfW = 0.5 - cornerR;
  const innerHalfH = 0.5 - cornerR;

  const dx = Math.max(0, Math.abs(px) - innerHalfW);
  const dy = Math.max(0, Math.abs(py) - innerHalfH);
  return Math.sqrt(dx * dx + dy * dy) - cornerR;
}

function getPixelRGBA(x, y, width, height) {
  const u = (x + 0.5) / width;
  const v = (y + 0.5) / height;

  const px = u - 0.5;
  const py = v - 0.5;

  // Check squircle background boundary
  const distSq = distToSquircle(px, py, 0.22);
  if (distSq > 0) {
    return [0, 0, 0, 0]; // Transparent
  }

  // Background gradient: dark blue (#0f2b3c) to light blue (#207ba1)
  const gradFactor = (u + v) / 2;
  let bgR = Math.round(15 + gradFactor * 17);
  let bgG = Math.round(43 + gradFactor * 80);
  let bgB = Math.round(60 + gradFactor * 101);
  let bgA = 255;

  // Gold border frame
  if (distSq > -0.018 && distSq <= 0) {
    bgR = 255;
    bgG = 214;
    bgB = 0;
  }

  // 1. Perspective Highway
  if (v >= 0.54 && v <= 0.86) {
    const roadV = (v - 0.54) / 0.32; // 0 to 1
    const halfWidth = 0.09 + roadV * 0.26;
    const dx = Math.abs(u - 0.5);

    if (dx <= halfWidth) {
      if (dx > halfWidth - 0.02) {
        // White border line
        return [255, 255, 255, 255];
      } else if (dx <= 0.015) {
        // Center yellow dashed line
        const dash = Math.floor(v * 22) % 2;
        if (dash === 0) {
          return [255, 214, 0, 255];
        }
      }
      // Asphalt color
      return [40, 50, 65, 255];
    }
  }

  // 2. Technical Scale Lines (Left & Right)
  if ((u >= 0.08 && u <= 0.14) || (u >= 0.86 && u <= 0.92)) {
    if (v >= 0.35 && v <= 0.70) {
      if (Math.abs((v * 100) % 6) < 0.8) {
        return [148, 163, 184, 180];
      }
    }
  }

  // 3. Compass Legs (behind helmet)
  const dLeg1 = Math.abs((v - 0.25) - (u - 0.27)); // Diagonal 1
  const dLeg2 = Math.abs((v - 0.25) - (0.73 - u)); // Diagonal 2
  if ((dLeg1 < 0.025 || dLeg2 < 0.025) && v >= 0.24 && v <= 0.62) {
    return [226, 232, 240, 220];
  }

  // 4. Engineering Hardhat Dome
  const hatCx = 0.5;
  const hatCy = 0.51;
  const hatRx = 0.25;
  const hatRy = 0.22;

  const dxHat = (u - hatCx) / hatRx;
  const dyHat = (v - hatCy) / hatRy;
  const hatEq = dxHat * dxHat + dyHat * dyHat;

  // Hardhat Brim
  const brimV = 0.51 - 0.03 * Math.cos(((u - 0.5) / 0.32) * Math.PI);
  const isBrim = Math.abs(u - 0.5) <= 0.32 && v >= brimV - 0.025 && v <= brimV + 0.025;

  if (isBrim) {
    if (v > brimV) {
      return [201, 130, 0, 255]; // Brim bottom shade
    }
    return [255, 214, 0, 255]; // Brim top gold
  }

  if (v <= hatCy && hatEq <= 1.0) {
    // Hardhat Dome
    // Central crest
    if (Math.abs(u - 0.5) <= 0.035) {
      return [255, 231, 102, 255]; // Lighter crest center
    }
    // Left highlight
    if (u < 0.44 && v < 0.48) {
      return [255, 234, 117, 255];
    }
    return [255, 214, 0, 255]; // Hardhat yellow
  }

  // 5. DER Badge on Hardhat
  if (Math.abs(u - 0.5) <= 0.05 && v >= 0.40 && v <= 0.47) {
    if (Math.abs(u - 0.5) <= 0.02 && v >= 0.42 && v <= 0.45) {
      return [255, 214, 0, 255]; // Badge star center
    }
    return [24, 94, 123, 255]; // Shield blue
  }

  return [bgR, bgG, bgB, bgA];
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return crc ^ 0xffffffff;
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, "ascii");
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc >>> 0, 8 + len);
  return buf;
}

function createPng(width, height) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRGBA(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrChunk = createChunk("IHDR", ihdrData);
  const idatChunk = createChunk("IDAT", compressed);
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createIcoFromPngs(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dataOffsetStart = headerSize + count * dirEntrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  let currentOffset = dataOffsetStart;

  for (let i = 0; i < count; i++) {
    const png = pngBuffers[i];
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);

    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(currentOffset, 12);

    dirEntries.push(entry);
    currentOffset += png.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

// Generate PNG sizes
console.log("Generating PNG icons...");
const png16 = createPng(16, 16);
const png32 = createPng(32, 32);
const png180 = createPng(180, 180);
const png192 = createPng(192, 192);
const png512 = createPng(512, 512);

fs.writeFileSync(path.join(publicDir, "favicon-16x16.png"), png16);
fs.writeFileSync(path.join(publicDir, "favicon-32x32.png"), png32);
fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), png180);
fs.writeFileSync(path.join(publicDir, "android-chrome-192x192.png"), png192);
fs.writeFileSync(path.join(publicDir, "android-chrome-512x512.png"), png512);

// Generate multi-resolution ICO file
const icoBuffer = createIcoFromPngs([png16, png32]);
fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuffer);
console.log("Created public/favicon.ico (16x16 + 32x32)");

console.log("All engineering icons successfully generated!");
