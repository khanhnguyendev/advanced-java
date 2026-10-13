import { useLocale, useTranslations } from 'next-intl';

export default function LocaleNotFound() {
  const t = useTranslations('notFound');
  const locale = useLocale();
  return (
    <main id="main-content" tabIndex={-1}>
      <title>{t('title')}</title>
      <h1>{t('title')}</h1>
      <p>{t('body')}</p>
      <p>
        <a href={`/${locale}`}>{t('home')}</a>
      </p>
    </main>
  );
}
