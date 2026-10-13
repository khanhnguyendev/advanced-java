import { describe, expect, it, vi } from 'vitest';
import { createPagefindEngine, type PagefindModule } from '@/lib/search/pagefind';

const result = (score: number, meta: Record<string, string>, excerpt: string, url = '/vi/x.html') => ({
  score,
  data: async () => ({ url, excerpt, meta }),
});

function fake(results: ReturnType<typeof result>[]): PagefindModule & { searched: unknown[]; opts: unknown[] } {
  const f = {
    searched: [] as unknown[],
    opts: [] as unknown[],
    options: async (o: unknown) => void f.opts.push(o),
    search: async (q: string, o?: unknown) => {
      f.searched.push([q, o]);
      return { results };
    },
  };
  return f;
}

describe('pagefind engine mapping', () => {
  it('maps results to SearchHit and strips mark tags', async () => {
    const pf = fake([
      result(2, { title: 'Why MQ', slug: 'why-mq', section: 'hc', lang: 'vi', fallback: 'false', href: '/vi/c/hc/why-mq' }, 'a <mark>message</mark> &amp; queue'),
      result(1, { title: '设计', slug: 'mq-design', section: 'hc', lang: 'zh', fallback: 'true', href: '/vi/c/hc/mq-design' }, ''),
    ]);
    const engine = createPagefindEngine('c', async () => pf);
    const hits = await engine.search('queue', 'vi');
    expect(hits).toEqual([
      { slug: 'why-mq', section: 'hc', title: 'Why MQ', excerpt: 'a message & queue', lang: 'vi', fallback: false, href: '/vi/c/hc/why-mq', score: 2 },
      { slug: 'mq-design', section: 'hc', title: '设计', excerpt: '', lang: 'zh', fallback: true, href: '/vi/c/hc/mq-design', score: 1 },
    ]);
    expect(pf.opts).toEqual([{ language: 'vi' }]);
    expect(pf.searched).toEqual([['queue', { filters: { collection: 'c' } }]]);
  });
  it('ranks native before fallback at equal score', async () => {
    const pf = fake([
      result(1, { title: 'F', slug: 'f', section: 's', lang: 'zh', fallback: 'true', href: '/vi/c/s/f' }, ''),
      result(1, { title: 'N', slug: 'n', section: 's', lang: 'vi', fallback: 'false', href: '/vi/c/s/n' }, ''),
    ]);
    const hits = await createPagefindEngine('c', async () => pf).search('q', 'vi');
    expect(hits.map((h) => h.slug)).toEqual(['n', 'f']);
  });
  it('returns [] when the index cannot load or search fails', async () => {
    const missing = createPagefindEngine('c', async () => {
      throw new Error('404');
    });
    expect(await missing.search('q', 'vi')).toEqual([]);
    const broken = fake([]);
    broken.search = vi.fn().mockRejectedValue(new Error('x'));
    expect(await createPagefindEngine('c', async () => broken).search('q', 'vi')).toEqual([]);
  });
});
