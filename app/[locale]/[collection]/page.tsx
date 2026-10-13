import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { contentRoot, listCollections, loadCollection } from '@/lib/content/collection';
import { routing } from '@/i18n/routing';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  const root = contentRoot();
  return routing.locales.flatMap((locale) => listCollections(root).map((collection) => ({ locale, collection })));
}

export default async function CollectionPage({ params }: { params: Promise<{ locale: string; collection: string }> }) {
  const { locale, collection } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const c = loadCollection(contentRoot(), collection);
  return (
    <main>
      <h1>{c.id}</h1>
      <ul>
        {c.sections.map((s) => (
          <li key={s.id}>
            <a href={`/${locale}/${collection}/${s.id}`}>{s.id}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
