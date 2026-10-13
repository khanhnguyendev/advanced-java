import { useTranslations } from 'next-intl';

export default function LocaleNotFound() {
  const t = useTranslations('notFound');
  return (
    <main>
      <title>{t('title')}</title>
      <h1>{t('title')}</h1>
      <p>{t('body')}</p>
    </main>
  );
}
