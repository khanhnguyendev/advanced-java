/**
 * Renders app/icon.svg (light variant) to the raster icons with the already-installed Playwright Chromium and
 * writes a PNG-embedded ICO by hand. Idempotent: same input, same bytes.
 *   pnpm exec tsx scripts/make-icons.ts
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const svg = readFileSync(path.join(ROOT, 'app/icon.svg'), 'utf8');

export function buildIco(images: { size: number; png: Buffer }[]): Buffer {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0); // reserved
  head.writeUInt16LE(1, 2); // type: icon
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach((img, i) => {
    const at = 6 + 16 * i;
    head.writeUInt8(img.size >= 256 ? 0 : img.size, at);
    head.writeUInt8(img.size >= 256 ? 0 : img.size, at + 1);
    head.writeUInt8(0, at + 2); // palette
    head.writeUInt8(0, at + 3);
    head.writeUInt16LE(1, at + 4); // planes
    head.writeUInt16LE(32, at + 6); // bpp
    head.writeUInt32LE(img.png.length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += img.png.length;
  });
  return Buffer.concat([head, ...images.map((i) => i.png)]);
}

async function main() {
  const browser = await chromium.launch();
  try {
  const ctx = await browser.newContext({ colorScheme: 'light', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const render = async (size: number): Promise<Buffer> => {
    await page.setViewportSize({ width: size, height: size });
    const sized = svg.replace(/width="32" height="32"/, `width="${size}" height="${size}"`);
    await page.setContent(`<!doctype html><html><body style="margin:0;background:#f4f8fc">${sized}</body></html>`);
    return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: size, height: size } });
  };
  // Next's ICO decoder wants RGBA PNGs; a canvas export always carries an alpha channel (the tile is opaque).
  const renderRgba = async (size: number): Promise<Buffer> => {
    const sized = svg.replace(/width="32" height="32"/, `width="${size}" height="${size}"`);
    const b64 = await page.evaluate(
      async ([markup, n]) => {
        const img = new Image();
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup as string);
        await img.decode();
        const c = document.createElement('canvas');
        c.width = c.height = n as number;
        c.getContext('2d')!.drawImage(img, 0, 0, n as number, n as number);
        return c.toDataURL('image/png').split(',')[1];
      },
      [sized, size] as const,
    );
    return Buffer.from(b64, 'base64');
  };
  mkdirSync(path.join(ROOT, 'public'), { recursive: true });
  writeFileSync(path.join(ROOT, 'app/icon.png'), await render(192));
  writeFileSync(path.join(ROOT, 'public/icon-512.png'), await render(512));
  writeFileSync(path.join(ROOT, 'app/apple-icon.png'), await render(180));
  const ico = [] as { size: number; png: Buffer }[];
  for (const size of [16, 32, 48]) ico.push({ size, png: await renderRgba(size) });
  writeFileSync(path.join(ROOT, 'app/favicon.ico'), buildIco(ico));
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) void main();
