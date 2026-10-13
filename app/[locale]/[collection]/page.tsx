import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
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

export default async function CollectionPage({ params }: { params: Promise<{ locale: string; collection: string }> }) {
  const { locale, collection } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const loc = locale as Locale;
  const root = contentRoot();
  const c = loadCollection(root, collection);
  const names = await getTranslations('languages');
  const td = await getTranslations('doc');
  const nav = buildNav(root, c, loc);
  return (
    <div className="shell">
      <div style={{ gridColumn: '1 / -1' }}>
        <TopBar
          locale={loc}
          collectionId={c.id}
          collectionTitle={c.id}
          homeHref={`/${loc}`}
          switcher={indexSwitcher(`/${collection}`, (l) => names(l))}
        />
      </div>
      <Sidebar nav={nav} currentSlug="" />
      <main id="main-content" className="reader">
        <div className="prose">
          <h1>{c.id}</h1>
          <ul>
            {nav.map((s) => (
              <li key={s.id}>
                <a href={`/${loc}/${collection}/${s.id}`}>{s.title}</a>{' '}
                <span
                  className="mono"
                  aria-label={`${td('translated')}: ${s.groups.flatMap((g) => g.docs).filter((d) => d.status !== 'fallback').length} / ${s.groups.reduce((n, g) => n + g.docs.length, 0)}`}
                >
                  {`${s.groups.flatMap((g) => g.docs).filter((d) => d.status !== 'fallback').length} / ${s.groups.reduce((n, g) => n + g.docs.length, 0)}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <div className="toc-rail" />
    </div>
  );
}
