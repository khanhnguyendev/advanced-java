import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('app/globals.css', 'utf8');

function block(re: RegExp): Record<string, string> {
  const m = re.exec(css);
  if (!m) throw new Error(`block not found: ${re}`);
  return Object.fromEntries([...m[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((x) => [x[1], x[2].trim()]));
}

const light = block(/:root\s*{([^}]*)}/);
const darkAttr = block(/:root\[data-theme="dark"\]\s*{([^}]*)}/);
const darkMedia = block(/@media \(prefers-color-scheme: dark\)\s*{\s*:root:not\(\[data-theme="light"\]\)\s*{([^}]*)}/);

function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe('design tokens', () => {
  it('defines every required token in all three theme blocks', () => {
    for (const set of [light, darkAttr, darkMedia]) {
      for (const k of ['--paper', '--ink', '--ink-muted', '--grid', '--accent', '--accent-ink', '--rule']) {
        expect(set[k], k).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
  it('keeps the media-query dark theme identical to the attribute dark theme', () => {
    expect(darkMedia).toEqual(darkAttr);
  });
  it('meets WCAG AA for text pairs in light and dark', () => {
    for (const set of [light, darkAttr]) {
      expect(ratio(set['--ink'], set['--paper'])).toBeGreaterThanOrEqual(4.5);
      expect(ratio(set['--ink-muted'], set['--paper'])).toBeGreaterThanOrEqual(4.5);
      expect(ratio(set['--accent'], set['--paper'])).toBeGreaterThanOrEqual(4.5);
      expect(ratio(set['--accent-ink'], set['--accent'])).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('hides the grid in reading mode and styles Han text only under :lang(zh)', () => {
    expect(css).toMatch(/\[data-reading="on"\][^{]*{[^}]*background-image:\s*none/s);
    expect(css).toMatch(/\.prose:lang\(zh\)/);
    expect(css).not.toMatch(/\.ui[^{]*{[^}]*--font-cjk/s);
  });
  it('respects reduced motion', () => {
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
});
