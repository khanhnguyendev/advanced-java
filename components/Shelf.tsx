import { useTranslations } from 'next-intl';
import { Attribution } from './Attribution';
import { LOCALES, type Locale } from '@/lib/content/types';

export interface ShelfItem {
  collection: string;
  title: string;
  tabColor: string;
  /** first and last catalog id of the notebook, e.g. "HC-01 – BD-12" */
  idRange?: string;
  total: number;
  perLocale: Record<Locale, number>;
}

export function Shelf({ locale, items }: { locale: Locale; items: ShelfItem[] }) {
  const t = useTranslations();
  return (
    <main id="main-content" tabIndex={-1} className="shelf">
      <h1>{t('site.title')}</h1>
      <p className="ui">{t('site.tagline')}</p>
      <ul className="spines" aria-label={t('nav.collections')}>
        {items.map((it) => (
          <li key={it.collection}>
            {it.idRange ? <span className="spine-ids mono">{it.idRange}</span> : null}
            <a href={`/${locale}/${it.collection}`}>
              <span className="spine-title">{it.title}</span>
            </a>
            <dl className="ui">
              {LOCALES.map((l) => (
                <div key={l}>
                  <dt className="ui-cjk" lang={l === 'zh' ? 'zh-Hans' : l}>{t(`languages.${l}`)}</dt>
                  <dd className="mono">{`${it.perLocale[l]} / ${it.total}`}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      <Attribution aboutHref={`/${locale}/about`} />
    </main>
  );
}
