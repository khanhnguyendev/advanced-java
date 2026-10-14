import { loadMeta } from './content/collection';
import type { CollectionConfig, Locale } from './content/types';

export interface NavDoc {
  slug: string;
  catalogId: string;
  title: string;
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

const navMemo = new Map<string, NavSection[]>();

export function __resetNavMemo(): void {
  navMemo.clear();
}

export function buildNav(root: string, c: CollectionConfig, locale: Locale): NavSection[] {
  const useMemo = process.env.NODE_ENV === 'production';
  const key = `${root}|${c.id}|${locale}`;
  if (useMemo) {
    const hit = navMemo.get(key);
    if (hit) return hit;
  }
  const out = computeNav(root, c, locale);
  if (useMemo) navMemo.set(key, out);
  return out;
}

function computeNav(root: string, c: CollectionConfig, locale: Locale): NavSection[] {
  const own = loadMeta(root, c.id, locale);
  const src = loadMeta(root, c.id, c.sourceLocale);
  const pick = <T,>(a: T | undefined, b: T | undefined, d: T) => a ?? b ?? d;

  return c.sections.map((s) => ({
    id: s.id,
    title: pick(own.sections[s.id], src.sections[s.id], s.id),
    groups: s.groups.map((g) => ({
      id: g.id,
      title: pick(own.groups[g.id], src.groups[g.id], g.id),
      docs: g.docs.map((slug) => ({
        slug,
        catalogId: c.ids[slug],
        title: pick(own.docs[slug]?.navTitle, src.docs[slug]?.navTitle, slug),
        href: `/${locale}/${c.id}/${s.id}/${slug}`,
      })),
    })),
  }));
}

export function flatDocs(nav: NavSection[]): NavDoc[] {
  return nav.flatMap((s) => s.groups.flatMap((g) => g.docs));
}
