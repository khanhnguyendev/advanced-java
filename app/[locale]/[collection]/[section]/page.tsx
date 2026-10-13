import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { DocList } from '@/components/DocList';
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
  return { title: sec?.title ?? section };
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
  return (
    <div className="shell">
      <div className="topbar-slot">
        <TopBar
          locale={loc}
          collectionId={c.id}
          collectionTitle={c.id}
          homeHref={`/${loc}`}
          switcher={indexSwitcher(`/${collection}/${section}`, (l) => names(l))}
        />
      </div>
      <Sidebar nav={nav} currentSlug="" />
      <main id="main-content" className="reader">
        <div className="prose">
          <nav className="ui breadcrumb" aria-label={tn('collections')}>
            <a href={`/${loc}/${collection}`}>{c.id}</a>
          </nav>
          <h1>{sec.title}</h1>
          <DocList groups={sec.groups} />
        </div>
      </main>
      <div className="toc-rail" />
    </div>
  );
}
