import { describe, expect, it } from 'vitest';
import { sanitizeSlug } from '../../scripts/import/slugs';

describe('sanitizeSlug', () => {
  it('keeps ordinary upstream slugs unchanged', () => {
    expect(sanitizeSlug('why-mq.md')).toBe('why-mq');
    expect(sanitizeSlug('redis-caching-avalanche-and-caching-penetration.md')).toBe(
      'redis-caching-avalanche-and-caching-penetration',
    );
  });
  it('drops the apostrophe', () => {
    expect(sanitizeSlug("what's-microservice-how-to-communicate.md")).toBe('whats-microservice-how-to-communicate');
  });
  it('normalizes case and separators', () => {
    expect(sanitizeSlug('Hello_World  Doc.md')).toBe('hello-world-doc');
  });
  it('throws when nothing usable remains', () => {
    expect(() => sanitizeSlug('---.md')).toThrow();
    expect(() => sanitizeSlug('中文.md')).toThrow();
  });
});
