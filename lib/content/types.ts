export const LOCALES = ['en', 'vi', 'zh'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export type DocStatus = 'machine' | 'reviewed';
export interface GroupConfig { id: string; docs: string[]; lead?: string }
export interface SectionConfig { id: string; prefix: string; groups: GroupConfig[] }
export interface CollectionConfig {
  id: string;
  sourceLocale: Locale;
  tabColor: string;
  fallback: Record<Locale, Locale[]>;
  sections: SectionConfig[];
  ids: Record<string, string>;
  upstream: { repo: string; commit: string };
  upstreamFiles: Record<string, string>;
}
export interface DocRef { collection: string; section: string; group: string; slug: string; catalogId: string }
export interface DocFrontmatter { source: { locale: Locale; slug: string; hash: string }; status: DocStatus; translatedAt: string; reviewedHash?: string }
export interface LocaleMeta {
  sections: Record<string, string>;
  groups: Record<string, string>;
  docs: Record<string, { title: string; navTitle: string }>;
}
