import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { CollectionIndex, type IndexSection } from '@/components/CollectionIndex';
import { Shelf, type ShelfItem } from '@/components/Shelf';
import { TopBar } from '@/components/TopBar';
import { routing } from '@/i18n/routing';
import { contentRoot, listCollections, loadCollection } from '@/lib/content/collection';
import type { Locale } from '@/lib/content/types';
import { buildNav, flatDocs } from '@/lib/nav';
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
  const loc = locale as Locale;
  const collections = listCollections(root);
  const items: ShelfItem[] = collections.map((id) => {
    const c = loadCollection(root, id);
    const ids = Object.values(c.ids);
    const idRange = ids.length > 1 ? `${ids[0]} – ${ids[ids.length - 1]}` : ids[0];
    return { collection: id, title: id, tabColor: c.tabColor, idRange };
  });
  return (
    <div className="grid-field">
      <div className="topbar-slot">
        <TopBar
          locale={locale as Locale}
          collectionId=""
          collectionTitle={site('title')}
          homeHref={`/${locale}`}
          switcher={indexSwitcher('', (l) => names(l))}
        />
      </div>
      {collections.length === 1 ? <Index root={root} id={collections[0]} locale={loc} /> : <Shelf locale={loc} items={items} />}
    </div>
  );
}

function Index({ root, id, locale }: { root: string; id: string; locale: Locale }) {
  const c = loadCollection(root, id);
  const nav = buildNav(root, c, locale);
  const sections: IndexSection[] = nav.map((s) => {
    const ids = s.groups.flatMap((g) => g.docs.map((d) => d.catalogId));
    return {
      id: s.id,
      title: s.title,
      href: `/${locale}/${id}/${s.id}`,
      idRange: ids.length > 1 ? `${ids[0]} – ${ids[ids.length - 1]}` : (ids[0] ?? ''),
      total: ids.length,
    };
  });
  const docs = flatDocs(nav).map((d) => ({ catalogId: d.catalogId, title: d.title, href: d.href }));
  return <CollectionIndex locale={locale} collection={id} sections={sections} docs={docs} />;
}
