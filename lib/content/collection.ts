import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { CollectionConfig, DocRef, Locale, LocaleMeta } from './types';

export function contentRoot(): string {
  return process.env.CONTENT_ROOT ?? path.join(process.cwd(), 'content');
}

export function loadCollection(root: string, id: string): CollectionConfig {
  const file = path.join(root, id, 'collection.json');
  const c = JSON.parse(readFileSync(file, 'utf8')) as CollectionConfig;
  if (c.id !== id) throw new Error(`collection.json id "${c.id}" does not match folder "${id}"`);
  return c;
}

export function listDocs(c: CollectionConfig): DocRef[] {
  const out: DocRef[] = [];
  const seen = new Set<string>();
  for (const s of c.sections) {
    for (const g of s.groups) {
      for (const slug of g.docs) {
        if (seen.has(slug)) throw new Error(`duplicate slug "${slug}" in collection ${c.id}`);
        seen.add(slug);
        const catalogId = c.ids[slug];
        if (!catalogId) throw new Error(`missing catalog id for slug "${slug}"`);
        out.push({ collection: c.id, section: s.id, group: g.id, slug, catalogId });
      }
    }
  }
  return out;
}

export function sectionOf(c: CollectionConfig, slug: string): string | undefined {
  for (const s of c.sections) for (const g of s.groups) if (g.docs.includes(slug)) return s.id;
  return undefined;
}

export function loadMeta(root: string, collection: string, locale: Locale): LocaleMeta {
  const file = path.join(root, collection, locale, 'meta.json');
  if (!existsSync(file)) return { sections: {}, groups: {}, docs: {} };
  return JSON.parse(readFileSync(file, 'utf8')) as LocaleMeta;
}

export function docFile(root: string, collection: string, locale: Locale, section: string, slug: string): string {
  return path.join(root, collection, locale, section, `${slug}.md`);
}
