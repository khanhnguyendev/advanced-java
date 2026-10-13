import type { Locale } from '../content/types';
import { rankHits } from './rank';
import type { SearchEngine, SearchHit } from './types';

interface PagefindData {
  url: string;
  excerpt: string;
  meta: Record<string, string | undefined>;
}
export interface PagefindModule {
  search(
    q: string,
    o?: { filters?: Record<string, string> },
  ): Promise<{ results: { score?: number; data(): Promise<PagefindData> }[] }>;
}
export type PagefindLoader = () => Promise<PagefindModule>;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ' };

function codePoint(n: number): string {
  try {
    return String.fromCodePoint(n);
  } catch {
    return '';
  }
}

function plainExcerpt(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:#x([0-9a-f]+)|#(\d+)|(amp|lt|gt|quot|nbsp));/gi, (_, hex?: string, dec?: string, name?: string) =>
      hex ? codePoint(parseInt(hex, 16)) : dec ? codePoint(parseInt(dec, 10)) : (ENTITIES[name!.toLowerCase()] ?? ''),
    );
}

function loadBrowserPagefind(): Promise<PagefindModule> {
  // Generated at build time into public/pagefind; not resolvable by the bundler or by tsc.
  // Root-absolute URL: basePath is not supported (next.config.ts sets none); add it here if one is ever configured.
  const url = ['', 'pagefind', 'pagefind.js'].join('/');
  return import(/* webpackIgnore: true */ /* turbopackIgnore: true */ /* @vite-ignore */ url) as Promise<PagefindModule>;
}

export function createPagefindEngine(collection: string, load: PagefindLoader = loadBrowserPagefind): SearchEngine {
  let loaded: Promise<PagefindModule | null> | null = null;
  // Pagefind 1.5.2 takes its language from <html lang>, which the route layout sets to the route locale,
  // so no options({ language }) call is needed (it would be a no-op).
  const getModule = () => {
    if (loaded) return loaded;
    let p: Promise<PagefindModule | null> | null = null;
    p = (async () => {
      await null; // yield so a synchronously throwing loader fails after `loaded` is assigned
      try {
        return await load();
      } catch {
        if (loaded === p) loaded = null; // index missing (e.g. `next dev` before a build): retry next time
        return null;
      }
    })();
    loaded = p;
    return p;
  };
  return {
    warm() {
      void getModule();
    },
    async search(query, locale) {
      try {
        const pf = await getModule();
        if (!pf) return [];
        const res = await pf.search(query, collection ? { filters: { collection } } : undefined);
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
