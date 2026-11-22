import fs from "fs";
import zlib from "zlib";

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function createPng(width, height, isMaskable = false) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bits
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = makeChunk("IHDR", ihdrData);

  // Generate pixels
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(rowBytes * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData.writeUInt8(0, rowOffset); // filter = 0

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Emerald green background gradient
      const t = y / height;
      const r = Math.round(5 + 11 * t);
      const g = Math.round(150 + 35 * (1 - t));
      const b = Math.round(105 + 30 * t);

      // Icon inner sheet shape
      const isInSheet = (Math.abs(dx) < width * 0.28 && Math.abs(dy) < height * 0.32);
      const isFold = (dx > width * 0.12 && dy < -height * 0.16);

      if (isInSheet && !isFold) {
        // White sheet body with dark emerald accents
        const isHorizontalLine = (Math.abs(dy) < height * 0.03 || Math.abs(dy + height * 0.1) < height * 0.03);
        if (isHorizontalLine && Math.abs(dx) < width * 0.2) {
          rawData.writeUInt8(16, pxOffset);     // R
          rawData.writeUInt8(185, pxOffset + 1); // G
          rawData.writeUInt8(129, pxOffset + 2); // B
          rawData.writeUInt8(255, pxOffset + 3); // A
        } else {
          rawData.writeUInt8(255, pxOffset);     // R
          rawData.writeUInt8(255, pxOffset + 1); // G
          rawData.writeUInt8(255, pxOffset + 2); // B
          rawData.writeUInt8(255, pxOffset + 3); // A
        }
      } else {
        // Background
        rawData.writeUInt8(r, pxOffset);
        rawData.writeUInt8(g, pxOffset + 1);
        rawData.writeUInt8(b, pxOffset + 2);
        rawData.writeUInt8(255, pxOffset + 3);
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk("IDAT", compressedData);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

if (!fs.existsSync("public/icons")) {
  fs.mkdirSync("public/icons", { recursive: true });
}

fs.writeFileSync("public/icons/icon-192.png", createPng(192, 192, false));
fs.writeFileSync("public/icons/icon-192-maskable.png", createPng(192, 192, true));
fs.writeFileSync("public/icons/icon-512.png", createPng(512, 512, false));
fs.writeFileSync("public/icons/icon-512-maskable.png", createPng(512, 512, true));

console.log("PWA Icons generated successfully in public/icons/");
