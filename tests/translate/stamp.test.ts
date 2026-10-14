import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { canonicalHash } from '@/lib/content/hash';
import { stampTranslation } from '@/scripts/translate/stamp';

function root(exceptions?: unknown) {
  const r = mkdtempSync(path.join(os.tmpdir(), 'stamp-'));
  const w = (rel: string, d: string) => {
    mkdirSync(path.dirname(path.join(r, rel)), { recursive: true });
    writeFileSync(path.join(r, rel), d);
  };
  w('c/collection.json', JSON.stringify({
    id: 'c', sourceLocale: 'zh', tabColor: '#000000', fallback: { vi: ['en', 'zh'], en: ['zh'], zh: ['zh'] },
    sections: [{ id: 's', prefix: 'S', groups: [{ id: 'g', docs: ['a'] }] }], ids: { a: 'S-01' },
    upstream: { repo: 'r', commit: 'c' }, upstreamFiles: { a: 'docs/s/a.md' },
  }));
  w('c/zh/s/a.md', '# 标题\n\n## 章节\n\n使用 `Kafka`。\n');
  if (exceptions) w('c/translation-exceptions.json', JSON.stringify(exceptions));
  return r;
}

describe('stampTranslation', () => {
  it('writes the translation with direct-from-zh frontmatter and status machine', () => {
    const r = root();
    const res = stampTranslation({
      root: r, collection: 'c', locale: 'vi', section: 's', slug: 'a', today: '2026-10-13',
      translatedBody: '# Tiêu đề\n\n## Chương\n\nDùng `Kafka`.\n',
    });
    expect(res.written).toBe(true);
    const parsed = matter(readFileSync(res.file, 'utf8'));
    expect(parsed.data).toMatchObject({
      status: 'machine',
      source: { locale: 'zh', slug: 'a', hash: canonicalHash('# 标题\n\n## 章节\n\n使用 `Kafka`。\n') },
    });
    expect(parsed.data.translatedAt).toBeTruthy();
    expect(parsed.content).toContain('# Tiêu đề');
  });
  it('refuses to write when a gate fails and reports why', () => {
    const r = root();
    const res = stampTranslation({
      root: r, collection: 'c', locale: 'en', section: 's', slug: 'a', today: '2026-10-13',
      translatedBody: '# Title\n\nOnly one heading and `kafka` altered.\n',
    });
    expect(res.written).toBe(false);
    expect(existsSync(res.file)).toBe(false);
    expect(res.issues.map((i) => i.code)).toEqual(expect.arrayContaining(['heading-structure', 'inline-code']));
  });
  it('never writes a status other than machine, and drops model-added frontmatter', () => {
    const r = root();
    const res = stampTranslation({
      root: r, collection: 'c', locale: 'vi', section: 's', slug: 'a', today: '2026-10-13',
      translatedBody: '---\nstatus: reviewed\nreviewedHash: abc\n---\n\n# Tiêu đề\n\n## Chương\n\nDùng `Kafka`.\n',
    });
    const data = matter(readFileSync(res.file, 'utf8')).data;
    expect(data.status).toBe('machine');
    expect(data).not.toHaveProperty('reviewedHash');
    expect(data).not.toHaveProperty('reviewed');
    expect(data.translatedAt).toBe('2026-10-13');
  });
  it('honours code-scoped exceptions from loadExceptions', () => {
    const r = root({ 'en/s/a': [{ code: 'inline-code', reason: 'test waiver' }] });
    const res = stampTranslation({
      root: r, collection: 'c', locale: 'en', section: 's', slug: 'a', today: '2026-10-13',
      translatedBody: '# Title\n\n## Chapter\n\nUse `kafka`.\n',
    });
    expect(res.written).toBe(true);
  });
  it('rejects js frontmatter in the translated body', () => {
    const r = root();
    expect(() =>
      stampTranslation({
        root: r, collection: 'c', locale: 'vi', section: 's', slug: 'a', today: '2026-10-13',
        translatedBody: '---js\n{ x: 1 }\n---\n# T\n',
      }),
    ).toThrow();
  });
  it('validates section, slug and date', () => {
    const r = root();
    const base = { root: r, collection: 'c', locale: 'vi' as const, translatedBody: '# T\n', today: '2026-10-13' };
    expect(() => stampTranslation({ ...base, section: '../x', slug: 'a' })).toThrow(/invalid/);
    expect(() => stampTranslation({ ...base, section: 's', slug: 'A b' })).toThrow(/invalid/);
    expect(() => stampTranslation({ ...base, section: 's', slug: 'a', today: 'yesterday' })).toThrow(/YYYY-MM-DD/);
  });
  it('refuses to overwrite a reviewed translation unless forced', () => {
    const r = root();
    const body = '# Tiêu đề\n\n## Chương\n\nDùng `Kafka`.\n';
    const file = path.join(r, 'c/vi/s/a.md');
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, '---\nstatus: reviewed\nreviewedHash: h\nsource:\n  locale: zh\n  slug: a\n  hash: x\n---\n\nold\n');
    const input = { root: r, collection: 'c', locale: 'vi' as const, section: 's', slug: 'a', today: '2026-10-13', translatedBody: body };
    const res = stampTranslation(input);
    expect(res.written).toBe(false);
    expect(res.issues.map((x) => x.code)).toContain('would-overwrite-reviewed');
    expect(readFileSync(file, 'utf8')).toContain('old');
    expect(stampTranslation({ ...input, force: true }).written).toBe(true);
  });
  it('reports waived exceptions with their reason', () => {
    const r = root({ 'en/s/a': [{ code: 'inline-code', reason: 'test waiver' }] });
    const res = stampTranslation({
      root: r, collection: 'c', locale: 'en', section: 's', slug: 'a', today: '2026-10-13',
      translatedBody: '# Title\n\n## Chapter\n\nUse `kafka`.\n',
    });
    expect(res.waived).toEqual([expect.objectContaining({ code: 'inline-code', reason: 'test waiver' })]);
  });
});

describe('stampTranslation hold policy', () => {
  const body = '# Tiêu đề\n\n## Chương\n\nDùng `Kafka`.\n';
  const held = (decision: string) => {
    const r = root();
    writeFileSync(path.join(r, 'c/translation-policy.json'), JSON.stringify({ hold: { 's/a': { reason: 'r', decision } } }));
    return r;
  };
  const stamp = (r: string) =>
    stampTranslation({ root: r, collection: 'c', locale: 'vi', section: 's', slug: 'a', today: '2026-10-13', translatedBody: body });
  it('refuses pending and exclude docs and writes nothing', () => {
    for (const d of ['pending', 'exclude']) {
      const r = held(d);
      const res = stamp(r);
      expect(res.written).toBe(false);
      expect(res.issues).toEqual([
        { level: 'error', code: 'held-doc', message: `doc is held by translation-policy.json (decision: ${d})` },
      ]);
      expect(existsSync(res.file)).toBe(false);
    }
  });
  it('translate lifts the block', () => {
    expect(stamp(held('translate')).written).toBe(true);
  });
});

