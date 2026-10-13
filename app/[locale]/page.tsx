import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Shelf, type ShelfItem } from '@/components/Shelf';
import { routing } from '@/i18n/routing';
import { contentRoot, listCollections, loadCollection } from '@/lib/content/collection';
import type { Locale } from '@/lib/content/types';
import { collectionStats } from '@/lib/stats';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ShelfPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const root = contentRoot();
  const items: ShelfItem[] = listCollections(root).map((id) => {
    const c = loadCollection(root, id);
    const s = collectionStats(root, c);
    return { collection: id, title: id, tabColor: c.tabColor, total: s.total, perLocale: s.perLocale };
  });
  return <Shelf locale={locale as Locale} items={items} />;
}
