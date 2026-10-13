import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { contentRoot, listCollections, listDocs, loadCollection } from '@/lib/content/collection';
import { routing } from '@/i18n/routing';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  const root = contentRoot();
  return routing.locales.flatMap((locale) =>
    listCollections(root).flatMap((collection) =>
      loadCollection(root, collection).sections.map((s) => ({ locale, collection, section: s.id })),
    ),
  );
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ locale: string; collection: string; section: string }>;
}) {
  const { locale, collection, section } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const c = loadCollection(contentRoot(), collection);
  const docs = listDocs(c).filter((d) => d.section === section);
  if (!docs.length) notFound();
  return (
    <main>
      <h1>{section}</h1>
      <ul>
        {docs.map((d) => (
          <li key={d.slug}>
            <a href={`/${locale}/${collection}/${section}/${d.slug}`}>
              {d.catalogId} {d.slug}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
