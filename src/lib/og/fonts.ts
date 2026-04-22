import fs from 'node:fs';
import path from 'node:path';
import { type Font, parse } from 'opentype.js';

type FontCache = {
  boldBuf: ArrayBuffer;
  regBuf: ArrayBuffer;
  boldFont: Font;
  regFont: Font;
};

let _cache: FontCache | null = null;

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  ) as ArrayBuffer;
}

function getCache(): FontCache {
  if (_cache) return _cache;
  const boldRaw = fs.readFileSync(
    path.join(process.cwd(), 'src/fonts/ars-bold.woff'),
  );
  const regRaw = fs.readFileSync(
    path.join(process.cwd(), 'src/fonts/ars-reg.woff'),
  );
  const boldBuf = toArrayBuffer(boldRaw);
  const regBuf = toArrayBuffer(regRaw);
  _cache = {
    boldBuf,
    regBuf,
    boldFont: parse(boldBuf),
    regFont: parse(regBuf),
  };
  return _cache;
}

export function getImageResponseFonts() {
  const { boldBuf, regBuf } = getCache();
  return [
    {
      name: 'ars-bold',
      data: boldBuf,
      weight: 700 as const,
      style: 'normal' as const,
    },
    {
      name: 'ars-reg',
      data: regBuf,
      weight: 400 as const,
      style: 'normal' as const,
    },
  ];
}

export function getParsedFonts() {
  const { boldFont, regFont } = getCache();
  return { boldFont, regFont };
}
