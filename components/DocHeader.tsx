import { useTranslations } from 'next-intl';
import type { NoticeKind } from '@/lib/notices';

export function DocHeader({
  catalogId,
  title,
  notices,
  requestedName,
  servedName,
  originalHref,
}: {
  catalogId: string;
  title: string;
  notices: NoticeKind[];
  requestedName: string;
  servedName: string;
  originalHref: string;
}) {
  const t = useTranslations('doc');
  return (
    <header className="doc-header">
      <p className="doc-id mono">{catalogId}</p>
      <h1>{title}</h1>
      {notices.map((n) => (
        <p key={n} role="note" className="notice">
          {n === 'fallback' && t('fallbackNotice', { requested: requestedName, served: servedName })}
          {n === 'machine' && t('machine')}
          {n === 'stale' && (
            <>
              {t('stale')} <a href={originalHref}>{t('viewOriginal')}</a>
            </>
          )}
        </p>
      ))}
    </header>
  );
}
