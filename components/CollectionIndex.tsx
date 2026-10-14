import { useTranslations } from 'next-intl';
import { Attribution } from './Attribution';
import { PrimaryAction, type ResumeDoc } from './PrimaryAction';
import { LOCALES, type Locale } from '@/lib/content/types';
import type { StatusCounts } from '@/lib/stats';

export interface IndexSection {
  id: string;
  title: string;
  href: string;
  /** "HC-01 – HC-28" */
  idRange: string;
  total: number;
  perLocale: Record<Locale, StatusCounts>;
}

/** Home page when the site has one collection: start or resume, then its sections as ruled rows. */
export function CollectionIndex({
  locale,
  sourceLocale,
  collection,
  sections,
  docs,
}: {
  locale: Locale;
  sourceLocale: Locale;
  collection: string;
  sections: IndexSection[];
  docs: ResumeDoc[];
}) {
  const t = useTranslations();
  const first = docs[0];
  return (
    <main id="main-content" tabIndex={-1} className="shelf collection-index">
      <h1>{t('site.title')}</h1>
      <p className="ui index-tagline">{t('site.tagline')}</p>
      {first ? (
        <PrimaryAction collection={collection} docs={docs}>
          <p className="index-primary ui">
            <a href={first.href} data-primary="start">
              <span className="index-primary-label">{t('home.start')}</span>
              <span className="index-primary-doc">
                <span className="mono">{first.catalogId}</span> {first.title}
              </span>
            </a>
          </p>
        </PrimaryAction>
      ) : null}
      <h2 className="index-heading ui">{t('home.sections')}</h2>
      <ul className="index-rows">
        {sections.map((s) => (
          <li key={s.id}>
            <a className="index-row" href={s.href}>
              <span className="index-range mono">{s.idRange}</span>
              <span className="index-title">{s.title}</span>
              <span className="index-count ui">{t('home.docCount', { count: s.total })}</span>
              <span className="index-langs ui">
                {LOCALES.map((l) => {
                  const c = s.perLocale[l];
                  // render with a sentinel, then wrap the language name in its own lang span
                  const MARK = '\u0000';
                  const text = l === sourceLocale
                    ? t('home.sectionLanguageOriginal', { language: MARK, total: c.total })
                    : t('home.sectionLanguage', {
                        language: MARK,
                        available: c.translated + c.machine,
                        total: c.total,
                        machine: c.machine,
                        fallback: c.fallback,
                      });
                  const [before, ...rest] = text.split(MARK);
                  return (
                    <span key={l} className="index-lang">
                      {before}
                      <span lang={l === 'zh' ? 'zh-Hans' : l}>{t(`languages.${l}`)}</span>
                      {rest.join(MARK)}
                    </span>
                  );
                })}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <Attribution aboutHref={`/${locale}/about`} />
    </main>
  );
}
