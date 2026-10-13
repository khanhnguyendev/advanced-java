import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { contentRoot, listCollections, loadCollection } from '@/lib/content/collection';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function About({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('about');
  const a = await getTranslations('attribution');
  const root = contentRoot();
  const upstream = listCollections(root).map((id) => loadCollection(root, id).upstream);
  return (
    <main id="main-content" className="reader">
      <article className="prose">
        <h1>{t('title')}</h1>
        <p>
          {t('codeLicense')} <a href="https://opensource.org/license/mit">MIT</a>
        </p>
        <p>
          {t('contentLicense')} <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC-BY-SA-4.0</a>
        </p>
        <p>
          {a('credit')}. <a href="https://github.com/doocs/advanced-java">doocs/advanced-java</a>
        </p>
        <p>
          {a('changesZh')}. {a('changesTranslated')}.
        </p>
        <h2>{t('imageCredits')}</h2>
        <p>{t('images')}</p>
        <ul>
          {upstream.map((u) => (
            <li key={u.commit}>
              <a href={`${u.repo}/tree/${u.commit}`}>{u.repo}</a> @ <span className="mono">{u.commit}</span>
            </li>
          ))}
        </ul>
      </article>
    </main>
  );
}
