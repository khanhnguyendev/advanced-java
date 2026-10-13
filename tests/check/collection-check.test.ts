import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkCollection, restampTranslation } from '@/lib/check/compare';
import { canonicalHash } from '@/lib/content/hash';

const ZH = '# 标题\n\n## 章节\n\n内容。\n';

function build(frontmatter: string, viBody = '# Tiêu đề\n\n## Phần\n\nNội dung.\n') {
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
});
