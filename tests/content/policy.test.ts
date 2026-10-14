import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { creditFor, loadCredits } from '@/lib/content/credits';
import { isHeld, loadPolicy } from '@/lib/content/policy';

function tmp(files: Record<string, string>) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'pol-'));
  for (const [rel, data] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), data);
  }
  return root;
}

describe('loadPolicy / isHeld', () => {
  it('returns an empty policy when the file is missing', () => {
    expect(loadPolicy(tmp({}), 'c')).toEqual({ hold: {} });
  });
  it('loads entries and blocks pending and exclude, not translate', () => {
    const p = loadPolicy(
      tmp({
        'c/translation-policy.json': JSON.stringify({
          hold: {
            's/a': { reason: 'r', decision: 'pending' },
            's/b': { reason: 'r', decision: 'exclude' },
            's/c': { reason: 'r', decision: 'translate' },
          },
        }),
      }),
      'c',
    );
    expect(isHeld(p, 's', 'a')).toBe(true);
    expect(isHeld(p, 's', 'b')).toBe(true);
    expect(isHeld(p, 's', 'c')).toBe(false);
    expect(isHeld(p, 's', 'zzz')).toBe(false);
  });
  it('throws a clear message on an unknown decision', () => {
    const root = tmp({ 'c/translation-policy.json': JSON.stringify({ hold: { 's/a': { reason: 'r', decision: 'maybe' } } }) });
    expect(() => loadPolicy(root, 'c')).toThrow(/decision must be one of pending, exclude, translate/);
  });
  it('throws on a missing reason and on invalid JSON', () => {
    expect(() => loadPolicy(tmp({ 'c/translation-policy.json': '{"hold":{"s/a":{"decision":"pending"}}}' }), 'c')).toThrow(/reason/);
    expect(() => loadPolicy(tmp({ 'c/translation-policy.json': '{' }), 'c')).toThrow(/invalid JSON/);
  });
});

describe('loadCredits / creditFor', () => {
  const good = { title: 'T', author: 'A', publisher: 'P', url: 'https://example.com/x', year: 2014 };
  it('returns {} when missing and looks up by section/slug', () => {
    expect(loadCredits(tmp({}), 'c')).toEqual({});
    const cr = loadCredits(tmp({ 'c/source-credits.json': JSON.stringify({ 's/a': good }) }), 'c');
    expect(creditFor(cr, 's', 'a')).toEqual(good);
    expect(creditFor(cr, 's', 'b')).toBeUndefined();
  });
  it('accepts an adaptation with a license and no year', () => {
    const ad = { kind: 'adaptation', title: 'T', author: 'A', publisher: 'P', url: 'https://example.com/x', license: { name: 'Apache-2.0', url: 'https://www.apache.org/licenses/LICENSE-2.0' } };
    const cr = loadCredits(tmp({ 'c/source-credits.json': JSON.stringify({ 's/a': ad }) }), 'c');
    expect(creditFor(cr, 's', 'a')).toEqual(ad);
  });
  it('rejects a bad kind, a bad license, a non-integer year and a translation without a year', () => {
    const run = (v: object) => () => loadCredits(tmp({ 'c/source-credits.json': JSON.stringify({ 's/a': v }) }), 'c');
    expect(run({ ...good, kind: 'copy' })).toThrow(/kind/);
    expect(run({ ...good, license: { name: '', url: 'https://x.org' } })).toThrow(/license\.name/);
    expect(run({ ...good, license: { name: 'MIT', url: 'ftp://x.org' } })).toThrow(/license\.url/);
    expect(run({ ...good, year: 2014.5 })).toThrow(/year/);
    expect(run({ ...good, year: undefined })).toThrow(/year/);
  });
  it('rejects a non-http(s) url and missing fields', () => {
    expect(() => loadCredits(tmp({ 'c/source-credits.json': JSON.stringify({ 's/a': { ...good, url: 'javascript:alert(1)' } }) }), 'c')).toThrow(/http/);
    expect(() => loadCredits(tmp({ 'c/source-credits.json': JSON.stringify({ 's/a': { ...good, author: '' } }) }), 'c')).toThrow(/author/);
  });
});

describe('real content policy and credits files', () => {
  it('parse and are consistent with the repo', () => {
    const root = path.resolve(__dirname, '../../content');
    const p = loadPolicy(root, 'advanced-java');
    expect(Object.keys(p.hold)).toHaveLength(10);
    expect(isHeld(p, 'micro-services', 'microservices-introduction')).toBe(true);
    expect(p.hold['high-availability/sentinel-vs-hystrix'].decision).toBe('translate');
    expect(Object.keys(loadCredits(root, 'advanced-java'))).toHaveLength(6);
  });
});
