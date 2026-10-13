import { useTranslations } from 'next-intl';
import type { NoticeKind } from '@/lib/notices';

export function DocHeader({
  catalogId,
  title,
  notices,
  requestedName,
  servedName,
  originalHref,
  titleLang,
  servedIsOriginal,
}: {
  catalogId: string;
  title: string;
  notices: NoticeKind[];
  requestedName: string;
  servedName: string;
  originalHref: string;
  /** BCP-47 tag of the language the title is written in; omitted when unknown (slug fallback). */
  titleLang?: string;
  /** false when the served doc is itself a translation (fallback between translated locales). */
  servedIsOriginal: boolean;
}) {
  const t = useTranslations('doc');
  return (
    <header className="doc-header">
      <p className="doc-id mono">{catalogId}</p>
      <h1 lang={titleLang}>{title}</h1>
      {notices.map((n) => (
        <p key={n} role="note" className="notice">
          {n === 'fallback' &&
            t(servedIsOriginal ? 'fallbackNotice' : 'fallbackNoticeTranslated', {
              requested: requestedName,
              served: servedName,
            })}
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
