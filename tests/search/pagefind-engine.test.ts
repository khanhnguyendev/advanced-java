import { describe, expect, it, vi } from 'vitest';
import { createPagefindEngine, type PagefindModule } from '@/lib/search/pagefind';

const result = (score: number, meta: Record<string, string>, excerpt: string, url = '/vi/x.html') => ({
  score,
  data: async () => ({ url, excerpt, meta }),
});

function fake(results: ReturnType<typeof result>[]): PagefindModule & { searched: unknown[] } {
  const f = {
    searched: [] as unknown[],
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
    expect(pf.searched).toEqual([['queue', { filters: { collection: 'c' } }]]);
  });
  it('searches without a filter when the collection is empty (home and about pages)', async () => {
    const pf = fake([result(1, { slug: 'a', title: 'A', href: '/vi/c/s/a' }, '')]);
    const hits = await createPagefindEngine('', async () => pf).search('q', 'vi');
    expect(hits).toHaveLength(1);
    expect(pf.searched).toEqual([['q', undefined]]);
  });
  it('ranks native before fallback at equal score', async () => {
    const pf = fake([
      result(1, { title: 'F', slug: 'f', section: 's', lang: 'zh', fallback: 'true', href: '/vi/c/s/f' }, ''),
      result(1, { title: 'N', slug: 'n', section: 's', lang: 'vi', fallback: 'false', href: '/vi/c/s/n' }, ''),
    ]);
    const hits = await createPagefindEngine('c', async () => pf).search('q', 'vi');
    expect(hits.map((h) => h.slug)).toEqual(['n', 'f']);
  });
  it('decodes named and numeric entities in excerpts', async () => {
    const pf = fake([result(1, { slug: 'a', title: 'A', href: '/vi/c/s/a' }, `it&#x27;s &#34;ok&#34; &lt;b&gt; &#xZZ; <mark>x</mark>`)]);
    const [h] = await createPagefindEngine('c', async () => pf).search('q', 'vi');
    expect(h.excerpt).toBe(`it's "ok" <b> &#xZZ; x`);
  });
  it('retries loading after a failed load', async () => {
    const pf = fake([result(1, { slug: 'a', title: 'A', href: '/vi/c/s/a' }, '')]);
    let calls = 0;
    const engine = createPagefindEngine('c', async () => {
      calls += 1;
      if (calls === 1) throw new Error('404');
      return pf;
    });
    expect(await engine.search('q', 'vi')).toEqual([]);
    expect((await engine.search('q', 'vi')).map((h) => h.slug)).toEqual(['a']);
    expect(calls).toBe(2);
  });
  it('retries after a synchronously throwing loader', async () => {
    const pf = fake([result(1, { slug: 'a', title: 'A', href: '/vi/c/s/a' }, '')]);
    let calls = 0;
    const engine = createPagefindEngine('c', (() => {
      calls += 1;
      if (calls === 1) throw new Error('sync');
      return Promise.resolve(pf);
    }) as () => Promise<PagefindModule>);
    expect(await engine.search('q', 'vi')).toEqual([]);
    expect((await engine.search('q', 'vi')).map((h) => h.slug)).toEqual(['a']);
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
