import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { contentRoot, listCollections, listDocs, loadCollection } from '@/lib/content/collection';
import { resolveDoc } from '@/lib/content/fallback';
import { headingsFor } from '@/lib/content/headings-index';
import { LOCALES, type Locale } from '@/lib/content/types';
import { extractHeadings } from '@/lib/render/headings';
import { renderMarkdown } from '@/lib/render/pipeline';
import { routing } from '@/i18n/routing';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  const root = contentRoot();
  const out: { locale: string; collection: string; section: string; slug: string }[] = [];
  for (const collection of listCollections(root)) {
    for (const d of listDocs(loadCollection(root, collection))) {
      for (const locale of LOCALES) out.push({ locale, collection, section: d.section, slug: d.slug });
    }
  }
  return out;
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ locale: string; collection: string; section: string; slug: string }>;
}) {
  const { locale, collection, section, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const root = contentRoot();
  const c = loadCollection(root, collection);
  const doc = resolveDoc(root, c, locale as Locale, section, slug);
  if (!doc) notFound();

  const { html } = await renderMarkdown(
    doc.body,
    {
      collection,
      routeLocale: locale as Locale,
      currentHeadings: extractHeadings(doc.body),
      headingsOf: (cc, ss, sl) => headingsFor(root, loadCollection(root, cc), locale as Locale, ss, sl),
    },
    { docRef: `${locale}/${collection}/${section}/${slug}` },
  );

  return (
    <main>
      <article lang={doc.served === 'zh' ? 'zh-Hans' : doc.served} dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
