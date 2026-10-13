import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/content/types';

export interface ShelfItem {
  collection: string;
  title: string;
  tabColor: string;
  total: number;
  perLocale: Record<Locale, number>;
}

export function Shelf({ locale, items }: { locale: Locale; items: ShelfItem[] }) {
  const t = useTranslations();
  return (
    <main id="main-content" className="shelf">
      <h1>{t('site.title')}</h1>
      <p className="ui">{t('site.tagline')}</p>
      <ul className="spines" aria-label={t('nav.collections')}>
        {items.map((it) => (
          <li key={it.collection} style={{ borderInlineStart: `6px solid ${it.tabColor}` }}>
            <a href={`/${locale}/${it.collection}`}>
              <span className="spine-title">{it.title}</span>
            </a>
            <dl className="ui">
              {(['en', 'vi', 'zh'] as Locale[]).map((l) => (
                <div key={l}>
                  <dt className="ui-cjk">{t(`languages.${l}`)}</dt>
                  <dd className="mono">{`${it.perLocale[l]} / ${it.total}`}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      <p className="ui">
        <a href={`/${locale}/about`}>{t('attribution.aboutLink')}</a>
      </p>
    </main>
  );
}
