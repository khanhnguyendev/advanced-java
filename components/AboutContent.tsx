import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/content/types';
import type { ImageCredit } from '@/lib/assets';
import type { DiagramCredit } from '@/lib/diagrams/credits';

export interface AboutCollection {
  id: string;
  repo: string;
  commit: string;
  images: ImageCredit[];
  diagrams?: DiagramCredit[];
}

export function AboutContent({ collections }: { collections: AboutCollection[] }) {
  const t = useTranslations('about');
  const a = useTranslations('attribution');
  const names = useTranslations('languages');
  const stop = a('stop');
  const served = collections.reduce((n, u) => n + u.images.length, 0);
  const redrawn = collections.reduce((n, u) => n + (u.diagrams?.length ?? 0), 0);
  const name = (l: Locale) => <span lang={l === 'zh' ? 'zh-Hans' : l}>{names(l)}</span>;
  return (
    <main id="main-content" tabIndex={-1} className="reader">
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
        <p>{t('images', { count: served })}</p>
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
        {redrawn > 0 ? (
          <>
            <h2>{t('diagramCredits')}</h2>
            <p>{t('diagrams', { count: redrawn })}</p>
            {collections.map((u) =>
              u.diagrams?.length ? (
                <details key={u.id}>
                  <summary>
                    <span className="mono">{u.id}</span> ({u.diagrams.length})
                  </summary>
                  <ul className="image-credits diagram-credits">
                    {u.diagrams.map((d) => (
                      <li key={d.id}>
                        <span className="mono">{d.id}</span>:{' '}
                        {t.rich('diagramEntry', {
                          path: d.path,
                          commit: u.commit,
                          link: (chunks) => (
                            <a href={d.href} className="mono">
                              {chunks}
                            </a>
                          ),
                        })}
                        {d.license === 'original' ? <> {t('diagramOriginal')}{stop}</> : null}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null,
            )}
          </>
        ) : null}
      </article>
    </main>
  );
}
