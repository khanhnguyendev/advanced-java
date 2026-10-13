import type { CollectionConfig } from './content/types';

export function upstreamFileUrl(c: CollectionConfig, slug: string): string {
  const file = c.upstreamFiles[slug];
  if (!file) throw new Error(`no upstream file recorded for slug "${slug}"`);
  const enc = encodeURI(file).replace(/'/g, '%27');
  return `${c.upstream.repo}/blob/${c.upstream.commit}/${enc}`;
}
