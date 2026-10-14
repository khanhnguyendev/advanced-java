import { describe, expect, it } from 'vitest';
import { buildPrompt } from '@/scripts/translate/prompt';

import { requireTitle } from '@/scripts/translate/prompt';

describe('buildPrompt', () => {
  const p = buildPrompt({
    locale: 'vi',
    slug: 'why-mq',
    title: 'Why use a message queue?',
    zhBody: '# 为什么使用消息队列？\n\n正文。\n',
    glossary: { 消息队列: 'hàng đợi tin nhắn', 幂等性: 'tính idempotent' },
    keep: ['Kafka', 'RabbitMQ'],
  });
  it('states the target language and that the source is Chinese', () => {
    expect(p).toContain('Vietnamese');
    expect(p).toContain('Chinese');
  });
  it('lists glossary entries and names to keep', () => {
    expect(p).toContain('消息队列 → hàng đợi tin nhắn');
    expect(p).toContain('Kafka');
  });
  it('carries the structural rules and the source body', () => {
    expect(p).toMatch(/do not change.*code/i);
    expect(p).toMatch(/same number of headings/i);
    expect(p).toMatch(/doc:|asset:/);
    expect(p).toContain('# 为什么使用消息队列？');
  });
  it('forbids translating from another translation', () => {
    expect(p).toMatch(/directly from the Chinese/i);
  });
  it('keeps inline code spans stable and does not tell the model to wrap generics in backticks', () => {
    expect(p).toMatch(/same inline code spans/i);
    expect(p).not.toMatch(/inside code spans/i);
    expect(p).toMatch(/without angle brackets/i);
  });
  it('documents the inline-code Han exception', () => {
    expect(p).toMatch(/inside an inline code span in the source stays inside that span unchanged/);
    expect(p).toContain('one place a Han character may remain');
  });
  it('carries first-use parenthetical and term-separation rules', () => {
    expect(p).toMatch(/11\. Glossary values written `A \(B\)`/);
    expect(p).toMatch(/only the first time the concept appears/);
    expect(p).toContain("宕机 (crash/outage, vi 'sập') and 挂起 (hang, vi 'treo') stay separate");
    expect(p).toContain('编排 (orchestration) and 编舞 (choreography) stay separate');
  });
  it('includes Vietnamese number rules for vi only', () => {
    expect(p).toMatch(/13\. Vietnamese only: write numbers in Vietnamese units/);
    expect(p).toMatch(/14\. Vietnamese only: write 临时耦合 as the glossary says/);
    const en = buildPrompt({ locale: 'en', slug: 's', title: 'T', zhBody: 'x', glossary: { 接口: 'API/interface' }, keep: [] });
    expect(en).not.toMatch(/Vietnamese only/);
    expect(en).toContain('接口 → API/interface');
  });
  it('states the guidance rule range per locale', () => {
    expect(p).toContain('Rules 8-15 are guidance');
    const en = buildPrompt({ locale: 'en', slug: 's', title: 'T', zhBody: 'x', glossary: {}, keep: [] });
    expect(en).toContain('Rules 8-15 are guidance');
  });
  it('carries the 接口 API vs interface rule in both locales', () => {
    const en = buildPrompt({ locale: 'en', slug: 's', title: 'T', zhBody: 'x', glossary: {}, keep: [] });
    for (const t of [p, en]) {
      expect(t).toMatch(/15\. 接口: when it means an API \(HTTP\/RPC\/service endpoint\) write API/);
      expect(t).toContain("Never 'giao diện' / 'user interface' for 接口.");
    }
  });
  it('pins the H1 to the meta title', () => {
    expect(p).toContain('The document\'s first heading `# …` MUST be exactly: Why use a message queue?');
  });
  it('forbids parentheticals in headings and a second 降级 term', () => {
    expect(p).toContain('Never put the parenthetical in a heading: headings use A only; give B at the first use in body prose.');
    expect(p).toContain('降级 has exactly one rendering per language (see glossary)');
    expect(p).toContain('Do not write a second term.');
    expect(p).toContain('An English word fallback that already appears in the Chinese source stays fallback.');
  });
  it('requireTitle returns the title or throws a clear error', () => {
    expect(requireTitle({ docs: { a: { title: 'T' } } }, 'a', 'en')).toBe('T');
    expect(() => requireTitle({ docs: {} }, 'a', 'vi')).toThrow(/run the titles tier first/);
    expect(() => requireTitle({ docs: { a: { title: ' ' } } }, 'a', 'vi')).toThrow(/titles tier/);
  });
});
