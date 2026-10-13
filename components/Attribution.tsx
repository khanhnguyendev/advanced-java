import { useTranslations } from 'next-intl';

export function Attribution({
  kind,
  fileUrl,
  aboutHref,
}: {
  kind: 'zh' | 'translated';
  fileUrl: string;
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
        {kind === 'zh' ? t('changesZh') : t('changesTranslated')}
        {stop}
        <a href={fileUrl}>{t('sourceFile')}</a>
        {stop}
        <a href={aboutHref}>{t('aboutLink')}</a>
      </p>
    </footer>
  );
}
