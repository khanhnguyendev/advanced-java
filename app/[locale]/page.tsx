import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Shelf, type ShelfItem } from '@/components/Shelf';
import { TopBar } from '@/components/TopBar';
import { routing } from '@/i18n/routing';
import { contentRoot, listCollections, loadCollection } from '@/lib/content/collection';
import type { Locale } from '@/lib/content/types';
import { collectionStats } from '@/lib/stats';
import { indexSwitcher } from '@/lib/switcher';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site' });
  return { title: t('title') };
}

export default async function ShelfPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const names = await getTranslations('languages');
  const site = await getTranslations('site');
  const root = contentRoot();
  const items: ShelfItem[] = listCollections(root).map((id) => {
    const c = loadCollection(root, id);
    const s = collectionStats(root, c);
    return { collection: id, title: id, tabColor: c.tabColor, total: s.total, perLocale: s.perLocale };
  });
  return (
    <>
      <TopBar
        locale={locale as Locale}
        collectionId=""
        collectionTitle={site('title')}
        homeHref={`/${locale}`}
        switcher={indexSwitcher('', (l) => names(l))}
      />
      <Shelf locale={locale as Locale} items={items} />
    </>
  );
}
