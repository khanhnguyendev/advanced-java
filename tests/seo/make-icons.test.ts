import { describe, expect, it } from 'vitest';
import { buildIco } from '@/scripts/make-icons';

describe('buildIco', () => {
  const imgs = [16, 32, 256].map((size, i) => ({ size, png: Buffer.alloc(10 + i, i + 1) }));
  const ico = buildIco(imgs);
  it('writes an ICONDIR header with the image count', () => {
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(3);
  });
  it('writes sizes (0 means 256), lengths and offsets that point at each payload', () => {
    const dataStart = 6 + 16 * 3;
    let expected = dataStart;
    imgs.forEach((img, i) => {
      const at = 6 + 16 * i;
      const w = ico.readUInt8(at);
      expect(w).toBe(img.size === 256 ? 0 : img.size);
      expect(ico.readUInt8(at + 1)).toBe(w);
      const len = ico.readUInt32LE(at + 8);
      const off = ico.readUInt32LE(at + 12);
      expect(len).toBe(img.png.length);
      expect(off).toBe(expected);
      expect(ico.subarray(off, off + len).equals(img.png)).toBe(true);
      expected += len;
    });
    expect(ico.length).toBe(expected);
  });
});
