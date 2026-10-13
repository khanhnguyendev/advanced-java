import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/content/types';
import type { ImageCredit } from '@/lib/assets';

export interface AboutCollection {
  id: string;
  repo: string;
  commit: string;
  images: ImageCredit[];
}

export function AboutContent({ collections }: { collections: AboutCollection[] }) {
  const t = useTranslations('about');
  const a = useTranslations('attribution');
  const names = useTranslations('languages');
  const stop = a('stop');
  const name = (l: Locale) => <span lang={l === 'zh' ? 'zh-Hans' : l}>{names(l)}</span>;
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
        <ul>
          <li>
            {name('zh')}: {a('changesZh')}
            {stop}
          </li>
          <li>
            {name('en')} / {name('vi')}: {a('changesTranslated')}
            {stop}
          </li>
        </ul>
        <ul>
          {collections.map((u) => (
            <li key={u.id}>
              <span className="mono">{u.id}</span>: {a('credit')}
              {stop}
              <a href={u.repo}>{u.repo.replace(/^https?:\/\/(www\.)?github\.com\//, '')}</a> @{' '}
              <a href={`${u.repo}/tree/${u.commit}`} className="mono">
                {u.commit}
              </a>
            </li>
          ))}
        </ul>
        <h2>{t('imageCredits')}</h2>
        <p>{t('images')}</p>
        {collections.map((u) =>
          u.images.length ? (
            <details key={u.id}>
              <summary>
                <span className="mono">{u.id}</span> ({u.images.length})
              </summary>
              <ul className="image-credits">
                {u.images.map((im) => (
                  <li key={im.path}>
                    <a href={im.href} className="mono">
                      {im.path}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          ) : null,
        )}
      </article>
    </main>
  );
}
