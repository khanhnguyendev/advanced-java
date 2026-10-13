import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const src = readFileSync('proxy.ts', 'utf8');
const literal = /matcher:\s*(\[[\s\S]*?\])\s*,?\s*}/.exec(src);
const matcher = new Function('return ' + literal![1])() as string[];
const rest = new RegExp('^' + matcher[1] + '$');

describe('proxy matcher (spec 6.2)', () => {
  it('is exactly the specified matcher', () => {
    expect(matcher).toEqual(['/', '/((?!(?:en|vi|zh)(?:/|$)|_next|api|.*\\..*).+)']);
  });
  it('runs on unprefixed paths', () => {
    expect(rest.test('/advanced-java/high-concurrency/why-mq')).toBe(true);
    expect(rest.test('/foo/bar')).toBe(true);
    expect(rest.test('/envelope')).toBe(true); // starts with "en" but is not a locale segment
  });
  it('never runs on locale-prefixed paths', () => {
    expect(rest.test('/en/advanced-java/x')).toBe(false);
    expect(rest.test('/vi/advanced-java/x')).toBe(false);
    expect(rest.test('/zh')).toBe(false);
    expect(rest.test('/vi/')).toBe(false);
  });
  it('never runs on assets, _next or api', () => {
    expect(rest.test('/_next/static/chunk.js')).toBe(false);
    expect(rest.test('/favicon.ico')).toBe(false);
    expect(rest.test('/_content/advanced-java/a/b/d.png')).toBe(false);
    expect(rest.test('/api/x')).toBe(false);
  });
});
