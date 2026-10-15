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

describe('cross-document view transitions', () => {
  const rm = css.indexOf('@media (prefers-reduced-motion: no-preference) {\n  @view-transition');
  it('opts in only inside prefers-reduced-motion: no-preference', () => {
    expect(rm).toBeGreaterThan(-1);
    expect(blockAt(rm)).toMatch(/@view-transition\s*{\s*navigation:\s*auto;\s*}/);
    // exactly one at-rule in the file, and it is the wrapped one
    expect(css.match(/@view-transition/g)).toHaveLength(1);
  });

  it('names persistent chrome uniquely and keeps the root crossfade short', () => {
    const inner = blockAt(rm);
    const names = [...inner.matchAll(/view-transition-name:\s*([\w-]+)/g)].map((m) => m[1]);
    expect(names.sort()).toEqual(['rail', 'toc-rail', 'topbar']);
    expect(inner).toMatch(/::view-transition-old\(root\), ::view-transition-new\(root\) { animation-duration: 140ms; animation-timing-function: ease-out; }/);
    expect(inner).toContain('::view-transition-group(*) { animation-duration: 140ms; }');
    // names are applied only to direct children of the shell (the sheet dialogs reuse .rail)
    for (const m of inner.matchAll(/([^{}]+){ view-transition-name/g)) expect(m[1].trim()).toMatch(/^\.shell > \./);
  });
});
