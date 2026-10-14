import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Attribution } from '@/components/Attribution';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { routing } from '@/i18n/routing';
import { contentRoot, listCollections, loadCollection } from '@/lib/content/collection';
import type { Locale } from '@/lib/content/types';
import { buildNav } from '@/lib/nav';
import { indexSwitcher } from '@/lib/switcher';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  const root = contentRoot();
  return routing.locales.flatMap((locale) => listCollections(root).map((collection) => ({ locale, collection })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; collection: string }>;
}): Promise<Metadata> {
  const { locale, collection } = await params;
  const t = await getTranslations({ locale, namespace: 'nav' });
  return { title: `${collection} · ${t('collections')}` };
}

export default async function CollectionPage({ params }: { params: Promise<{ locale: string; collection: string }> }) {
  const { locale, collection } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const loc = locale as Locale;
  const root = contentRoot();
  const c = loadCollection(root, collection);
  const names = await getTranslations('languages');
  const nav = buildNav(root, c, loc);
  return (
    <div className="shell">
      <div className="topbar-slot">
        <TopBar
          locale={loc}
          collectionId={c.id}
          collectionTitle={c.id}
          homeHref={`/${loc}`}
          switcher={indexSwitcher(`/${collection}`, (l) => names(l))}
        />
      </div>
      <Sidebar nav={nav} currentSlug="" />
      <main id="main-content" tabIndex={-1} className="reader">
        <div className="prose">
          <h1>{c.id}</h1>
          <ul>
            {nav.map((s) => (
              <li key={s.id}>
                <a href={`/${loc}/${collection}/${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ul>
          <Attribution aboutHref={`/${loc}/about`} />
        </div>
      </main>
      <div className="toc-rail" />
    </div>
  );
}
