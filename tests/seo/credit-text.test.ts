import { describe, expect, it } from 'vitest';
import { creditKeys, creditPlainText, type PlainTranslator } from '@/lib/credit-text';
import en from '@/messages/en.json';

const a = en.attribution as Record<string, string>;
const fill = (s: string, v: Record<string, unknown>) =>
  s.replace(/\{(\w+)\}/g, (_m, k: string) => String(v[k] ?? '')).replace(/<\/?\w+>/g, '');
const t = Object.assign((k: string) => a[k], { markup: (k: string, v: Record<string, unknown>) => fill(a[k], v) }) as PlainTranslator;
const base = { title: 'T', author: 'A', publisher: 'P', url: 'https://o.test' };

describe('creditKeys', () => {
  it('picks the license sentence by kind and the source sentence by kind and served language', () => {
    expect(creditKeys({ ...base, year: 1 }, 'en')).toEqual({ source: 'sourceCreditTranslated', license: 'licenseCredited' });
    expect(creditKeys({ ...base, kind: 'adaptation' }, 'zh')).toEqual({ source: 'sourceCreditAdapted', license: 'licenseCredited' });
    expect(creditKeys({ ...base, kind: 'derived' }, 'vi')).toEqual({ source: 'sourceCreditDerivedTranslated', license: 'licenseDerived' });
  });
});

describe('creditPlainText', () => {
  it('ends with the visible license sentence and carries the source sentence', () => {
    const text = creditPlainText(t, { ...base, year: 2014 }, 'en');
    expect(text.endsWith(a.licenseCredited)).toBe(true);
    expect(text).toContain('“T” by A, P, 2014');
    expect(text).not.toMatch(/[<>{}]/);
  });
  it('adds the original license for an adaptation', () => {
    const text = creditPlainText(t, { ...base, kind: 'adaptation', license: { name: 'Apache-2.0', url: 'https://l.test' } }, 'en');
    expect(text).toContain('The original is licensed under Apache-2.0.');
  });
});
