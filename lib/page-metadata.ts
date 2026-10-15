import type { Metadata } from 'next';
import { LOCALES, type Locale } from './content/types';

export const SITE_NAME = 'advanced-java';
export const OG_ALT = 'advanced-java: Java architecture notes';
export const OG_LOCALE: Record<Locale, string> = { en: 'en_US', vi: 'vi_VN', zh: 'zh_CN' };
export const BCP47: Record<Locale, string> = { en: 'en', vi: 'vi', zh: 'zh-Hans' };

export interface PageMetaInput {
  title: string;
  description: string;
  /** path of the canonical URL (resolved against metadataBase) */
  canonical: string;
  languages: Record<string, string>;
  /** locale of the content at the canonical URL */
  locale: Locale;
  /** locales that really exist for this page */
  available?: readonly Locale[];
  type: 'website' | 'article';
  /** locale segment of the requested URL; picks which per-locale share image is used */
  routeLocale: Locale;
}

export function pageMetadata(o: PageMetaInput): Metadata {
  // A page-level openGraph replaces the segment's file-based image, so the image is set explicitly.
  const image = { url: `/${o.routeLocale}/opengraph-image`, width: 1200, height: 630, alt: OG_ALT, type: 'image/png' };
  const others = (o.available ?? LOCALES).filter((l) => l !== o.locale).map((l) => OG_LOCALE[l]);
  return {
    title: o.title,
    description: o.description,
    alternates: { canonical: o.canonical, languages: o.languages },
    openGraph: {
      type: o.type,
      title: o.title,
      description: o.description,
      url: o.canonical,
      siteName: SITE_NAME,
      locale: OG_LOCALE[o.locale],
      alternateLocale: others,
      images: [image],
    },
    twitter: { card: 'summary_large_image', title: o.title, description: o.description, images: [{ url: image.url, alt: OG_ALT }] },
  };
}
