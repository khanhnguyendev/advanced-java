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
  return (
    <footer className="attribution ui">
      <p>
        <a href="https://creativecommons.org/licenses/by-sa/4.0/">{t('license')}</a>. {t('credit')}.{' '}
        {kind === 'zh' ? t('changesZh') : t('changesTranslated')} <a href={fileUrl}>{t('sourceFile')}</a>.{' '}
        <a href={aboutHref}>{t('aboutLink')}</a>
      </p>
    </footer>
  );
}
