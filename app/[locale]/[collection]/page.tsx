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
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbLd } from '@/lib/jsonld';
import { truncate } from '@/lib/description';
import { BCP47, pageMetadata } from '@/lib/page-metadata';
import { indexAlternates, siteUrl } from '@/lib/seo';

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
  const seo = await getTranslations({ locale, namespace: 'seo' });
  const root = contentRoot();
  const nav = buildNav(root, loadCollection(root, collection), locale as Locale);
  const count = nav.reduce((n, s) => n + s.groups.reduce((m, g) => m + g.docs.length, 0), 0);
  const topic = new Intl.ListFormat(BCP47[locale as Locale], { type: 'unit' }).format(nav.map((s) => s.title));
  const alt = indexAlternates(locale as Locale, `/${collection}`);
  return pageMetadata({
    title: `${collection} · ${t('collections')}`,
    description: truncate(seo('documentsOn', { count, topic })),
    canonical: alt.canonical,
    languages: alt.languages,
    locale: locale as Locale,
    type: 'website',
    routeLocale: locale as Locale,
  });
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
  const base = siteUrl();
  const site = await getTranslations('site');
  return (
    <div className="shell">
      <JsonLd
        data={breadcrumbLd([
          { name: site('title'), url: `${base}/${loc}` },
          { name: c.id, url: base + indexAlternates(loc, `/${collection}`).canonical },
        ])}
      />
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
