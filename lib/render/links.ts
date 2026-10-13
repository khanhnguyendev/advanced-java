import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';
import { listCollections, loadCollection } from '../content/collection';
import type { Locale } from '../content/types';
import type { HeadingInfo } from './headings';

export interface LinkContext {
  collection: string;
  routeLocale: Locale;
  currentHeadings: HeadingInfo[];
  headingsOf: (collection: string, section: string, slug: string) => HeadingInfo[] | null;
  /** true when `content/<collection>/_assets/<rel>` is an existing file */
  assetExists: (collection: string, rel: string) => boolean;
  /** true when the collection declares the section */
  sectionExists: (collection: string, section: string) => boolean;
}

/** File-system backed target checks for LinkContext, rooted at the content directory. */
export function fsLinkTargets(root: string): Pick<LinkContext, 'assetExists' | 'sectionExists'> {
  return {
    assetExists(collection, rel) {
      if (!listCollections(root).includes(collection)) return false;
      const base = path.resolve(root, collection, '_assets');
      const file = path.resolve(base, rel);
      if (!file.startsWith(base + path.sep)) return false;
      return existsSync(file) && statSync(file).isFile();
    },
    sectionExists(collection, section) {
      if (!listCollections(root).includes(collection)) return false;
      return loadCollection(root, collection).sections.some((x) => x.id === section);
    },
  };
}

export function resolveHref(url: string, ctx: LinkContext): string {
  const loc = ctx.routeLocale;

  let m = /^doc:([^/#]+)\/([^/#]+)\/([^#]+?)(?:#h(\d+))?$/.exec(url);
  if (m) {
    const [, collection, section, slug, n] = m;
    const headings = ctx.headingsOf(collection, section, slug);
    if (!headings) throw new Error(`doc link target not found: ${url}`);
    const base = `/${loc}/${collection}/${section}/${slug}`;
    if (!n) return base;
    const h = headings.find((x) => x.index === Number(n));
    if (!h) throw new Error(`doc link ${url}: target has no heading h${n}`);
    return `${base}#${h.id}`;
  }

  m = /^section:([^/#]+)\/([^/#]+)$/.exec(url);
  if (m) {
    if (!ctx.sectionExists(m[1], m[2])) throw new Error(`section link target not found: ${url}`);
    return `/${loc}/${m[1]}/${m[2]}`;
  }

  if (url === 'home:') return `/${loc}`;

  m = /^asset:(.+)$/.exec(url);
  if (m) {
    const rel = m[1];
    if (rel.split(/[\\/]/).includes('..')) throw new Error(`asset link must not contain "..": ${url}`);
    if (!ctx.assetExists(ctx.collection, rel)) throw new Error(`asset link target not found: ${url}`);
    return `/_content/${ctx.collection}/${rel}`;
  }

  m = /^#h(\d+)$/.exec(url);
  if (m) {
    const h = ctx.currentHeadings.find((x) => x.index === Number(m![1]));
    if (!h) throw new Error(`same-document link ${url}: no heading h${m[1]}`);
    return `#${h.id}`;
  }

  if (/^(doc|section|home|asset):/.test(url)) throw new Error(`malformed link: ${url}`);
  return url;
}

export function rehypeResolveLinks(ctx: LinkContext) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const prop = node.tagName === 'a' ? 'href' : node.tagName === 'img' ? 'src' : null;
      if (!prop) return;
      const v = node.properties?.[prop];
      if (typeof v === 'string') node.properties![prop] = resolveHref(v, ctx);
    });
  };
}
