import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { contentRoot, listCollections } from '@/lib/content/collection';
import { routing } from '@/i18n/routing';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Shelf({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const collections = listCollections(contentRoot());
  return (
    <main>
      <h1>advanced-java</h1>
      <ul>
        {collections.map((c) => (
          <li key={c}>
            <a href={`/${locale}/${c}`}>{c}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
