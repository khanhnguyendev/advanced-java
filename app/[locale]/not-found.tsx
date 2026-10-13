import { useTranslations } from 'next-intl';

export default function LocaleNotFound() {
  const t = useTranslations('notFound');
  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('body')}</p>
    </main>
  );
}
