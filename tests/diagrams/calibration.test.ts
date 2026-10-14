import { describe, expect, it } from 'vitest';
import { freeTextLayout, layoutRect, nodeTextLayout, rectContains, TEXT_HALF_H, TEXT_PAD_X } from '@/lib/diagrams/geometry';

// Real boxes measured in Chromium (SVG getBBox, 13px, dominant-baseline central) on the pilot review page,
// 360 and 1280 px, zh/en/vi. Text rects are the font line box, centred on the text y.
const REAL_LINE_HEIGHT = { min: 15.42, max: 18.1 };
const REAL_HALF_MAX = 9.05;

describe('text rect calibration', () => {
  it('pins the vertical and horizontal pads', () => {
    expect(TEXT_HALF_H).toBe(10.1);
    expect(TEXT_PAD_X).toBe(1.5);
    expect(TEXT_HALF_H - REAL_HALF_MAX).toBeGreaterThanOrEqual(1);
  });

  it('a one-line estimated rect contains the worst measured line box with >= 1px margin', () => {
    const rect = layoutRect(freeTextLayout('Yêu cầu 2: orderId=1', ['orderId=1'], 198, 137, 'start'));
    const real = { x0: 198, x1: 198 + 137.7, y0: 137 - REAL_LINE_HEIGHT.max / 2, y1: 137 + REAL_LINE_HEIGHT.max / 2 };
    expect(rectContains(rect, { x0: real.x0 - 0, y0: real.y0, x1: real.x1, y1: real.y1 })).toBe(true);
    expect(real.y0 - rect.y0).toBeGreaterThanOrEqual(1);
    expect(rect.y1 - real.y1).toBeGreaterThanOrEqual(1);
    expect(real.x0 - rect.x0).toBeGreaterThanOrEqual(1);
    expect(rect.x1 - real.x1).toBeGreaterThanOrEqual(1);
  });

  it('a multi-line node label rect spans (n-1) line pitches plus the calibrated half height each end', () => {
    const tl = nodeTextLayout({ shape: 'box', x: 0, y: 0, w: 200, h: 100 }, 'a\nb', []);
    const r = layoutRect(tl);
    expect(r.y1 - r.y0).toBeCloseTo(13 * 1.3 + 2 * TEXT_HALF_H);
  });

  it('does not inflate the vertical extent beyond 25% of the median measured line box (16.85)', () => {
    expect((2 * TEXT_HALF_H) / 16.85).toBeLessThan(1.25);
  });
});
