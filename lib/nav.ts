import { loadMeta } from './content/collection';
import { resolveDoc } from './content/fallback';
import type { CollectionConfig, Locale } from './content/types';

export interface NavDoc {
  slug: string;
  catalogId: string;
  title: string;
  status: 'translated' | 'machine' | 'fallback';
  href: string;
}
export interface NavGroup {
  id: string;
  title: string;
  docs: NavDoc[];
}
export interface NavSection {
  id: string;
  title: string;
  groups: NavGroup[];
}

export function buildNav(root: string, c: CollectionConfig, locale: Locale): NavSection[] {
  const own = loadMeta(root, c.id, locale);
  const src = loadMeta(root, c.id, c.sourceLocale);
  const pick = <T,>(a: T | undefined, b: T | undefined, d: T) => a ?? b ?? d;

  return c.sections.map((s) => ({
    id: s.id,
    title: pick(own.sections[s.id], src.sections[s.id], s.id),
    groups: s.groups.map((g) => ({
      id: g.id,
      title: pick(own.groups[g.id], src.groups[g.id], g.id),
      docs: g.docs.map((slug) => {
        const r = resolveDoc(root, c, locale, s.id, slug);
        const status: NavDoc['status'] =
          !r || r.fallback
            ? 'fallback'
            : r.served === c.sourceLocale || r.frontmatter?.status === 'reviewed'
              ? 'translated'
              : 'machine';
        return {
          slug,
          catalogId: c.ids[slug],
          title: pick(own.docs[slug]?.navTitle, src.docs[slug]?.navTitle, slug),
          status,
          href: `/${locale}/${c.id}/${s.id}/${slug}`,
        };
      }),
    })),
  }));
}

export function flatDocs(nav: NavSection[]): NavDoc[] {
  return nav.flatMap((s) => s.groups.flatMap((g) => g.docs));
}
