import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AboutContent } from '@/components/AboutContent';
import { TopBar } from '@/components/TopBar';
import { routing } from '@/i18n/routing';
import { listImageCredits } from '@/lib/assets';
import { contentRoot, listCollections, loadCollection } from '@/lib/content/collection';
import type { Locale } from '@/lib/content/types';
import { indexSwitcher } from '@/lib/switcher';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function About({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const loc = locale as Locale;
  const names = await getTranslations('languages');
  const site = await getTranslations('site');
  const root = contentRoot();
  const collections = listCollections(root).map((id) => {
    const c = loadCollection(root, id);
    return { id, repo: c.upstream.repo, commit: c.upstream.commit, images: listImageCredits(root, c) };
  });
  return (
    <>
      <TopBar
        locale={loc}
        collectionId=""
        collectionTitle={site('title')}
        homeHref={`/${loc}`}
        switcher={indexSwitcher('/about', (l) => names(l))}
      />
      <AboutContent collections={collections} />
    </>
  );
}
