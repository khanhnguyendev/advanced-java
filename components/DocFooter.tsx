import { useTranslations } from 'next-intl';
import type { NavDoc } from '@/lib/nav';

export function DocFooter({ prev, next }: { prev?: NavDoc; next?: NavDoc }) {
  const t = useTranslations('nav');
  return (
    <nav className="doc-footer ui" aria-label={`${t('previous')} / ${t('next')}`}>
      {prev ? (
        <a rel="prev" href={prev.href}>
          ← {t('previous')}: {prev.title}
        </a>
      ) : (
        <span />
      )}
      {next ? (
        <a rel="next" href={next.href}>
          {t('next')}: {next.title} →
        </a>
      ) : null}
    </nav>
  );
}
