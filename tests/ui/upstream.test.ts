import { describe, expect, it } from 'vitest';
import { upstreamFileUrl } from '@/lib/upstream';
import type { CollectionConfig } from '@/lib/content/types';

const c = {
  upstream: { repo: 'https://github.com/doocs/advanced-java', commit: '1a35221' },
  upstreamFiles: {
    'why-mq': 'docs/high-concurrency/why-mq.md',
    whats: "docs/micro-services/what's-microservice-how-to-communicate.md",
  },
} as unknown as CollectionConfig;

describe('upstreamFileUrl', () => {
  it('links the exact upstream file at the recorded commit', () => {
    expect(upstreamFileUrl(c, 'why-mq')).toBe(
      'https://github.com/doocs/advanced-java/blob/1a35221/docs/high-concurrency/why-mq.md',
    );
  });
  it('encodes the apostrophe', () => {
    expect(upstreamFileUrl(c, 'whats')).toBe(
      'https://github.com/doocs/advanced-java/blob/1a35221/docs/micro-services/what%27s-microservice-how-to-communicate.md',
    );
  });
  it('throws for an unknown slug', () => {
    expect(() => upstreamFileUrl(c, 'nope')).toThrow(/nope/);
  });
});
