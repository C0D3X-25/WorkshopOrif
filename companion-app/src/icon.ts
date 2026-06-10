import zlib from 'zlib';

/**
 * Generates a valid 22x22 PNG icon from pure Node.js built-ins (no native deps).
 * Used as the system tray icon when no external icon file is present.
 */

let crcTable: Uint32Array | undefined;

function crc32(buf: Buffer): number {
  const table = crcTable ?? (crcTable = buildTable());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return ((crc ^ 0xffffffff) >>> 0);
}

function buildTable(): Uint32Array {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * Returns a Buffer containing a valid PNG of the given size filled with RGB color.
 */
function solidColorPng(size: number, r: number, g: number, b: number): Buffer {
  const rowLen = 1 + size * 3; // filter byte + 3 bytes per pixel (RGB)
  const raw = Buffer.allocUnsafe(size * rowLen);
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0; // filter type: None
    for (let x = 0; x < size; x++) {
      const i = y * rowLen + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB truecolor
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Blue #3A86FF square, 22×22 — suitable for menu bar / tray */
export function createTrayIconBuffer(): Buffer {
  return solidColorPng(22, 0x3a, 0x86, 0xff);
}
