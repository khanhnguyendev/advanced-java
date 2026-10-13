import type { Locale } from '../content/types';

export interface SearchHit {
  slug: string;
  section: string;
  title: string;
  excerpt: string;
  lang: Locale;
  fallback: boolean;
  href: string;
  score: number;
}
export interface SearchEngine {
  search(query: string, locale: Locale): Promise<SearchHit[]>;
  /** Optional: start loading the index ahead of the first query (called on focus). */
  warm?(locale: Locale): void;
}
