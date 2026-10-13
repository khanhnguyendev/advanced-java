import { useTranslations } from 'next-intl';

export function Attribution({
  kind,
  fileUrl,
  aboutHref,
}: {
  /** omitted on index pages, where no single document is being attributed */
  kind?: 'zh' | 'translated';
  /** omitted on index pages: the upstream file link is shown only on a document page */
  fileUrl?: string;
  aboutHref: string;
}) {
  const t = useTranslations('attribution');
  const stop = t('stop');
  return (
    <footer className="attribution ui">
      <p>
        <a href="https://creativecommons.org/licenses/by-sa/4.0/">{t('license')}</a>
        {stop}
        {t('credit')}
        {stop}
        {kind ? (
          <>
            {kind === 'zh' ? t('changesZh') : t('changesTranslated')}
            {stop}
          </>
        ) : null}
        {fileUrl ? (
          <>
            <a href={fileUrl}>{t('sourceFile')}</a>
            {stop}
          </>
        ) : null}
        <a href={aboutHref}>{t('aboutLink')}</a>
      </p>
    </footer>
  );
}
