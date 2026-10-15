import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { DocList } from '@/components/DocList';
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
import { pageMetadata } from '@/lib/page-metadata';
import { indexAlternates, siteUrl } from '@/lib/seo';

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; collection: string; section: string }>;
}): Promise<Metadata> {
  const { locale, collection, section } = await params;
  const root = contentRoot();
  const c = loadCollection(root, collection);
  const sec = buildNav(root, c, locale as Locale).find((s) => s.id === section);
  const seo = await getTranslations({ locale, namespace: 'seo' });
  const title = sec?.title ?? section;
  const count = sec ? sec.groups.reduce((m, g) => m + g.docs.length, 0) : 0;
  const alt = indexAlternates(locale as Locale, `/${collection}/${section}`);
  return pageMetadata({
    title,
    description: truncate(seo('documentsOn', { count, topic: title })),
    canonical: alt.canonical,
    languages: alt.languages,
    locale: locale as Locale,
    type: 'website',
    routeLocale: locale as Locale,
  });
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ locale: string; collection: string; section: string }>;
}) {
  const { locale, collection, section } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const loc = locale as Locale;
  const root = contentRoot();
  const c = loadCollection(root, collection);
  const names = await getTranslations('languages');
  const tn = await getTranslations('nav');
  const nav = buildNav(root, c, loc);
  const sec = nav.find((s) => s.id === section);
  if (!sec) notFound();
  const base = siteUrl();
  const site = await getTranslations('site');
  return (
    <div className="shell">
      <JsonLd
        data={breadcrumbLd([
          { name: site('title'), url: `${base}/${loc}` },
          { name: c.id, url: `${base}/${loc}/${collection}` },
          { name: sec.title, url: base + indexAlternates(loc, `/${collection}/${section}`).canonical },
        ])}
      />
      <div className="topbar-slot">
        <TopBar
          locale={loc}
          collectionId={c.id}
          collectionTitle={c.id}
          homeHref={`/${loc}`}
          switcher={indexSwitcher(`/${collection}/${section}`, (l) => names(l))}
        />
      </div>
      <Sidebar nav={nav} currentSlug="" currentSection={section} />
      <main id="main-content" tabIndex={-1} className="reader">
        <div className="prose">
          <nav className="ui breadcrumb" aria-label={tn('collections')}>
            <a href={`/${loc}/${collection}`}>{c.id}</a>
          </nav>
          <h1>{sec.title}</h1>
          <DocList groups={sec.groups} />
          <Attribution aboutHref={`/${loc}/about`} />
        </div>
      </main>
      <div className="toc-rail" />
    </div>
  );
}
