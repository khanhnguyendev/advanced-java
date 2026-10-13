import { describe, expect, it } from 'vitest';
import { buildPrompt } from '@/scripts/translate/prompt';

describe('buildPrompt', () => {
  const p = buildPrompt({
    locale: 'vi',
    slug: 'why-mq',
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
});
