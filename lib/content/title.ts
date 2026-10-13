import { loadMeta } from './collection';
import type { CollectionConfig, Locale } from './types';

export interface DocTitle {
  title: string;
  /** BCP-47 tag of the language the title is written in; undefined when the title is only the slug. */
  lang: string | undefined;
}

const bcp47 = (l: Locale) => (l === 'zh' ? 'zh-Hans' : l);

/** Title of a doc plus the language of the meta that actually supplied it. */
export function docTitleOf(root: string, c: CollectionConfig, served: Locale | undefined, slug: string): DocTitle {
  const locale = served ?? c.sourceLocale;
  const own = loadMeta(root, c.id, locale).docs[slug]?.title;
  if (own) return { title: own, lang: bcp47(locale) };
  const src = loadMeta(root, c.id, c.sourceLocale).docs[slug]?.title;
  if (src) return { title: src, lang: bcp47(c.sourceLocale) };
  return { title: slug, lang: undefined };
}
