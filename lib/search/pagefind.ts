import type { Locale } from '../content/types';
import { rankHits } from './rank';
import type { SearchEngine, SearchHit } from './types';

interface PagefindData {
  url: string;
  excerpt: string;
  meta: Record<string, string | undefined>;
}
export interface PagefindModule {
  options(o: { language: string }): Promise<void> | void;
  search(
    q: string,
    o?: { filters?: Record<string, string> },
  ): Promise<{ results: { score?: number; data(): Promise<PagefindData> }[] }>;
}
export type PagefindLoader = () => Promise<PagefindModule>;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };

function plainExcerpt(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e: string) => ENTITIES[e] ?? '');
}

function loadBrowserPagefind(): Promise<PagefindModule> {
  // Generated at build time into public/pagefind; not resolvable by the bundler or by tsc.
  const url = ['', 'pagefind', 'pagefind.js'].join('/');
  return import(/* webpackIgnore: true */ /* turbopackIgnore: true */ /* @vite-ignore */ url) as Promise<PagefindModule>;
}

export function createPagefindEngine(collection: string, load: PagefindLoader = loadBrowserPagefind): SearchEngine {
  let loaded: Promise<PagefindModule | null> | null = null;
  const getModule = (locale: Locale) => {
    loaded ??= (async () => {
      try {
        const pf = await load();
        await pf.options({ language: locale });
        return pf;
      } catch {
        return null; // index missing (e.g. `next dev` before a build)
      }
    })();
    return loaded;
  };
  return {
    warm(locale) {
      void getModule(locale);
    },
    async search(query, locale) {
      try {
        const pf = await getModule(locale);
        if (!pf) return [];
        const res = await pf.search(query, { filters: { collection } });
        const hits: SearchHit[] = await Promise.all(
          res.results.slice(0, 20).map(async (r) => {
            const d = await r.data();
            const m = d.meta;
            return {
              slug: m.slug ?? '',
              section: m.section ?? '',
              title: m.title ?? m.slug ?? '',
              excerpt: plainExcerpt(d.excerpt ?? ''),
              lang: (m.lang ?? locale) as Locale,
              fallback: m.fallback === 'true',
              href: m.href ?? d.url,
              score: r.score ?? 0,
            };
          }),
        );
        return rankHits(hits);
      } catch {
        return [];
      }
    },
  };
}

export function pagefindEngine(collection: string): SearchEngine {
  return createPagefindEngine(collection);
}
