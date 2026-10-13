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
});
