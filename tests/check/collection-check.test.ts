import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkCollection, loadExceptions, markReviewed, restampTranslation } from '@/lib/check/compare';
import { canonicalHash } from '@/lib/content/hash';

const ZH = '# 标题\n\n## 章节\n\n内容。\n';

function build(frontmatter: string, viBody = '# Tiêu đề\n\n## Phần\n\nNội dung.\n', extra: Record<string, string> = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'chk-'));
  const w = (rel: string, data: string) => {
    const f = path.join(root, rel);
    mkdirSync(path.dirname(f), { recursive: true });
    writeFileSync(f, data);
  };
  w('c/collection.json', JSON.stringify({
    id: 'c', sourceLocale: 'zh', tabColor: '#000000',
    fallback: { vi: ['en', 'zh'], en: ['zh'], zh: ['zh'] },
    sections: [{ id: 's', prefix: 'S', groups: [{ id: 'g', docs: ['a'] }] }],
    ids: { a: 'S-01' }, upstream: { repo: 'r', commit: 'c' }, upstreamFiles: { a: 'docs/s/a.md' },
  }));
  const zh = ZH;
  w('c/zh/s/a.md', zh);
  w('c/vi/s/a.md', frontmatter + viBody);
  const m = (title: string) => JSON.stringify({ sections: {}, groups: {}, docs: { a: { title, navTitle: title } } });
  w('c/zh/meta.json', m('标题'));
  w('c/vi/meta.json', m('Tiêu đề'));
  for (const [rel, data] of Object.entries(extra)) w(rel, data);
  return { root, zh };
}

describe('checkCollection', () => {
  it('passes a valid machine translation made directly from zh', () => {
    const { root } = build(
      `---\nsource:\n  locale: zh\n  slug: a\n  hash: ${canonicalHash(ZH)}\nstatus: machine\ntranslatedAt: 2026-10-13\n---\n\n`,
    );
    const r = checkCollection(root, 'c');
    expect(r.errors).toEqual([]);
    expect(r.stale).toEqual([]);
    expect(r.checked).toBe(1);
  });
  it('errors when a translation was not made directly from zh', () => {
    const { root } = build('---\nsource:\n  locale: en\n  slug: a\n  hash: x\nstatus: machine\ntranslatedAt: 2026-10-13\n---\n\n');
    expect(checkCollection(root, 'c').errors.join('\n')).toMatch(/directly from zh/);
  });
  it('errors on an invalid status value', () => {
    const { root } = build(
      `---\nsource:\n  locale: zh\n  slug: a\n  hash: ${canonicalHash(ZH)}\nstatus: approved\ntranslatedAt: 2026-10-13\n---\n\n`,
    );
    expect(checkCollection(root, 'c').errors.join('\n')).toMatch(/status/);
  });
  it('lists a stale translation as stale (warning), not an error', () => {
    const { root } = build('---\nsource:\n  locale: zh\n  slug: a\n  hash: sha256:v1:old\nstatus: machine\ntranslatedAt: 2026-10-13\n---\n\n');
    const r = checkCollection(root, 'c');
    expect(r.errors).toEqual([]);
    expect(r.stale).toEqual(['vi/s/a']);
  });
  it('restamp updates source.hash to the current zh hash', () => {
    const { root, zh } = build('---\nsource:\n  locale: zh\n  slug: a\n  hash: sha256:v1:old\nstatus: machine\ntranslatedAt: 2026-10-13\n---\n\n');
    restampTranslation(root, 'c', 'vi', 'a');
    expect(readFileSync(path.join(root, 'c/vi/s/a.md'), 'utf8')).toContain(canonicalHash(zh));
    expect(checkCollection(root, 'c').stale).toEqual([]);
  });

  const goodFm = (extra = '') =>
    `---\nsource:\n  locale: zh\n  slug: a\n  hash: ${canonicalHash(ZH)}\nstatus: machine\ntranslatedAt: 2026-10-13\n${extra}---\n\n`;

  it('rejects js frontmatter without executing it', () => {
    const { root } = build('---js\n({ source: { hash: "x" } })\n---\n\n');
    const r = checkCollection(root, 'c');
    expect(r.errors.join('\n')).toMatch(/vi\/s\/a: \[parse\]/);
  });
  it('errors on source.slug mismatch', () => {
    const { root } = build(goodFm().replace('slug: a', 'slug: zzz'));
    expect(checkCollection(root, 'c').errors.join('\n')).toMatch(/source\.slug/);
  });
  it('errors when the zh source is missing', () => {
    const { root } = build(goodFm());
    rmSync(path.join(root, 'c/zh/s/a.md'));
    expect(checkCollection(root, 'c').errors.join('\n')).toMatch(/source file missing/);
  });
  it('checks en alongside vi', () => {
    const { root } = build(goodFm(), undefined, {
      'c/en/s/a.md': goodFm() + '# Title\n\n## Part\n\nBody.\n',
      'c/en/meta.json': JSON.stringify({ sections: {}, groups: {}, docs: { a: { title: 'Title', navTitle: 'Title' } } }),
    });
    const r = checkCollection(root, 'c');
    expect(r.checked).toBe(2);
    expect(r.errors).toEqual([]);
  });
  it('reports malformed YAML as a parse error and keeps going', () => {
    const { root } = build('---\nsource: [unclosed\n---\n\n', undefined, { 'c/en/s/a.md': goodFm() + '# Title\n\n## Part\n\nBody.\n' });
    const r = checkCollection(root, 'c');
    expect(r.errors.join('\n')).toMatch(/vi\/s\/a: \[parse\]/);
    expect(r.checked).toBe(2);
  });
  it('applies reviewed exceptions with a reason, and warns on unused ones', () => {
    const { root } = build(goodFm(), '# Tiêu đề\n\n## Phần\n\n### Extra\n\nNội dung.\n', {
      'c/translation-exceptions.json': JSON.stringify({
        'vi/s/a': [{ code: 'heading-structure', reason: 'added subsection' }, { code: 'inline-code', reason: 'n/a' }],
      }),
    });
    const r = checkCollection(root, 'c');
    expect(r.errors).toEqual([]);
    expect(r.warnings.join('\n')).toMatch(/exception applied \[heading-structure\] \(added subsection\)/);
    expect(r.warnings.join('\n')).toMatch(/exception \[inline-code\] matched nothing/);
  });
  it('rejects a malformed exceptions file naming the file', () => {
    const { root } = build(goodFm(), undefined, {
      'c/translation-exceptions.json': JSON.stringify({ 'vi/s/a': [{ code: 'x', reason: '' }] }),
    });
    expect(() => loadExceptions(root, 'c')).toThrow(/translation-exceptions\.json/);
    const { root: r2 } = build(goodFm(), undefined, { 'c/translation-exceptions.json': JSON.stringify({ 'vi/s/a': ['inline-code'] }) });
    expect(() => loadExceptions(r2, 'c')).toThrow(/translation-exceptions\.json/);
  });
  it('flags a reviewed translation that changed since review, and markReviewed clears it', () => {
    const { root } = build(goodFm().replace('status: machine', 'status: reviewed'));
    const r = checkCollection(root, 'c');
    expect(r.reviewedChanged).toEqual(['vi/s/a']);
    expect(r.errors).toEqual([]);
    markReviewed(root, 'c', 'vi', 'a');
    const after = checkCollection(root, 'c');
    expect(after.reviewedChanged).toEqual([]);
    const text = readFileSync(path.join(root, 'c/vi/s/a.md'), 'utf8');
    expect(text).toMatch(/status: reviewed/);
    expect(text).toMatch(/translatedAt: '?2026-10-13'?\n/);
  });
  it('lists text diagram blocks as sampled', () => {
    const body = '# T\n\n## S\n\n```\n+--+\n```\n';
    const zh = '# 标\n\n## 节\n\n```\n+--+\n```\n';
    const { root } = build(goodFm(), body, { 'c/zh/s/a.md': zh });
    const fm = goodFm().replace(canonicalHash(ZH), canonicalHash(zh));
    writeFileSync(path.join(root, 'c/vi/s/a.md'), fm + body);
    expect(checkCollection(root, 'c').sampled).toEqual(['vi/s/a: text-block:0']);
  });
});

describe('policy, credits and title gates', () => {
  const fm = `---\nsource:\n  locale: zh\n  slug: a\n  hash: ${canonicalHash(ZH)}\nstatus: machine\ntranslatedAt: 2026-10-13\n---\n\n`;
  const meta = (title: string) => JSON.stringify({ sections: {}, groups: {}, docs: { a: { title, navTitle: title } } });
  const ok = {
    'c/zh/meta.json': meta('标题'),
    'c/vi/meta.json': meta('Tiêu đề'),
  };

  it('passes when every meta title equals its H1', () => {
    const { root } = build(fm, undefined, ok);
    expect(checkCollection(root, 'c').errors).toEqual([]);
  });
  it('flags a title that differs from the H1 (vi), naming locale, slug and both strings', () => {
    const { root } = build(fm, undefined, { ...ok, 'c/vi/meta.json': meta('Khác') });
    const e = checkCollection(root, 'c').errors.join('\n');
    expect(e).toMatch(/vi\/s\/a: \[title-h1-mismatch\].*"Khác".*"Tiêu đề"/);
  });
  it('flags a zh source whose meta title differs from its H1', () => {
    const { root } = build(fm, undefined, { ...ok, 'c/zh/meta.json': meta('别的') });
    expect(checkCollection(root, 'c').errors.join('\n')).toMatch(/zh\/s\/a: \[title-h1-mismatch\]/);
  });
  it('compares after NFC normalization and whitespace collapse', () => {
    const { root } = build(fm, '# Tiêu đề\n\n## Phần\n\nNội dung.\n', { ...ok, 'c/vi/meta.json': meta('Tiêu  đề'.normalize('NFD')) });
    expect(checkCollection(root, 'c').errors).toEqual([]);
  });
  it('flags a near-miss en title against its H1', () => {
    const { root } = build(fm, undefined, {
      ...ok,
      'c/en/s/a.md': fm + '# A Description of the Microservices Architecture\n\n## Part\n\nBody.\n',
      'c/en/meta.json': meta('Describing the Microservices Architecture'),
    });
    expect(checkCollection(root, 'c').errors.join('\n')).toMatch(
      /en\/s\/a: \[title-h1-mismatch\].*"Describing the Microservices Architecture".*"A Description of the Microservices Architecture"/,
    );
  });
  it('errors with title-missing-h1 when a body has no depth-1 heading', () => {
    const { root } = build(fm, '## Phần\n\nNội dung.\n', ok);
    expect(checkCollection(root, 'c').errors.join('\n')).toMatch(/\[title-missing-h1\]/);
  });
  it('errors held-doc-translated for a translation of a blocked doc, not when decision is translate', () => {
    const hold = (decision: string) => ({ ...ok, 'c/translation-policy.json': JSON.stringify({ hold: { 's/a': { reason: 'r', decision } } }) });
    expect(checkCollection(build(fm, undefined, hold('pending')).root, 'c').errors.join('\n')).toMatch(/vi\/s\/a: \[held-doc-translated\]/);
    expect(checkCollection(build(fm, undefined, hold('exclude')).root, 'c').errors.join('\n')).toMatch(/held-doc-translated/);
    expect(checkCollection(build(fm, undefined, hold('translate')).root, 'c').errors).toEqual([]);
  });
  it('errors on policy and credit keys that match no doc', () => {
    const credit = { title: 'T', author: 'A', publisher: 'P', url: 'https://example.com', year: 2014 };
    const { root } = build(fm, undefined, {
      ...ok,
      'c/translation-policy.json': JSON.stringify({ hold: { 's/nope': { reason: 'r', decision: 'pending' } } }),
      'c/source-credits.json': JSON.stringify({ 's/gone': credit }),
    });
    const e = checkCollection(root, 'c').errors.join('\n');
    expect(e).toMatch(/\[policy-unknown-doc\]/);
    expect(e).toMatch(/\[credit-unknown-doc\]/);
  });
});

