import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('app/globals.css', 'utf8');

/** Text of the balanced `{...}` block that follows `start`. */
function blockAt(start: number): string {
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error('unbalanced css');
}

describe('diagram loading skeleton', () => {
  const scripting = css.indexOf('@media (scripting: enabled)');
  const motion = css.indexOf('@media screen and (prefers-reduced-motion: no-preference) {\n  .diagram-scroll');

  it('lives inside @media (scripting: enabled) and never matches loaded slots', () => {
    expect(scripting).toBeGreaterThan(-1);
    const inner = blockAt(scripting);
    expect(inner).toContain('.diagram-scroll[data-diagram-src]');
    expect(inner).toContain(':not([data-state="loaded"])');
    expect(inner).toContain(':not([data-state="error"])');
    // and no unwrapped copy of the skeleton rule
    expect(css.match(/\.diagram-scroll\[data-diagram-src\][^{]*{[^}]*background/g)).toHaveLength(1);
  });

  it('keeps fade-in and tint fade-out keyframes inside screen and prefers-reduced-motion: no-preference', () => {
    expect(motion).toBeGreaterThan(-1);
    const inner = blockAt(motion);
    expect(inner).toContain('@keyframes diagram-in');
    expect(inner).toContain('@keyframes diagram-tint-out');
    expect(css.match(/@keyframes diagram-in/g)).toHaveLength(1);
    expect(css.match(/@keyframes diagram-tint-out/g)).toHaveLength(1);
  });

  it('has no reduced-motion override fighting the tint', () => {
    expect(css).not.toMatch(/prefers-reduced-motion: reduce\) {[^}]*diagram-scroll/);
  });
});
