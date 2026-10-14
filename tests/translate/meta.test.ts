import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyMeta, buildMetaPrompt } from '@/scripts/translate/meta';

const zhMeta = {
  sections: { s: '高并发架构' },
  groups: { g: '消息队列' },
  docs: { a: { title: '为什么使用消息队列？', navTitle: '为什么用 MQ' } },
};

describe('meta tier', () => {
  it('prompt includes the zh json and asks for identical keys', () => {
    const p = buildMetaPrompt({ locale: 'en', zhMeta, glossary: { 消息队列: 'message queue' } });
    expect(p).toContain('高并发架构');
    expect(p).toMatch(/identical keys/i);
    expect(p).toContain('消息队列 → message queue');
    expect(p).toMatch(/use A only/);
    expect(p).toMatch(/one rendering per concept/);
  });
  it('applyMeta writes valid meta and rejects missing or extra keys', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'meta-'));
    mkdirSync(path.join(root, 'c/zh'), { recursive: true });
    writeFileSync(path.join(root, 'c/zh/meta.json'), JSON.stringify(zhMeta));
    const ok = {
      sections: { s: 'High concurrency' },
      groups: { g: 'Message queues' },
      docs: { a: { title: 'Why use a message queue?', navTitle: 'Why MQ' } },
    };
    const { file } = applyMeta({ root, collection: 'c', locale: 'en', translated: ok });
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(ok);
    expect(() =>
      applyMeta({ root, collection: 'c', locale: 'en', translated: { ...ok, docs: {} } }),
    ).toThrow(/keys/i);
    expect(() =>
      applyMeta({ root, collection: 'c', locale: 'vi', translated: { ...ok, docs: { a: { title: '', navTitle: 'x' } } } }),
    ).toThrow(/empty/i);
  });
  it('rejects extra nested keys and accepts reordered keys', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'meta-'));
    mkdirSync(path.join(root, 'c/zh'), { recursive: true });
    writeFileSync(path.join(root, 'c/zh/meta.json'), JSON.stringify(zhMeta));
    const ok = {
      sections: { s: 'High concurrency' },
      groups: { g: 'Message queues' },
      docs: { a: { title: 'Why use a message queue?', navTitle: 'Why MQ' } },
    };
    expect(() => applyMeta({ root, collection: 'c', locale: 'en', translated: { ...ok, extra: {} } })).toThrow(/keys/i);
    expect(() =>
      applyMeta({ root, collection: 'c', locale: 'en', translated: { ...ok, docs: { a: { ...ok.docs.a, x: 'y' } } } }),
    ).toThrow(/keys/i);
    const reordered = {
      docs: { a: { navTitle: 'Why MQ', title: 'Why use a message queue?' } },
      groups: ok.groups,
      sections: ok.sections,
    };
    const { file } = applyMeta({ root, collection: 'c', locale: 'en', translated: reordered });
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(ok);
  });
});
