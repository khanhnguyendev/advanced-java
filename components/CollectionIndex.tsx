import { useTranslations } from 'next-intl';
import { Attribution } from './Attribution';
import { PrimaryAction, type ResumeDoc } from './PrimaryAction';
import type { Locale } from '@/lib/content/types';

export interface IndexSection {
  id: string;
  title: string;
  href: string;
  /** "HC-01 – HC-28" */
  idRange: string;
  total: number;
}

/** Home page when the site has one collection: start or resume, then its sections as ruled rows. */
export function CollectionIndex({
  locale,
  collection,
  sections,
  docs,
}: {
  locale: Locale;
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
            </a>
          </li>
        ))}
      </ul>
      <Attribution aboutHref={`/${locale}/about`} />
    </main>
  );
}
