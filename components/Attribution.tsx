import { useTranslations } from 'next-intl';
import type { SourceCredit } from '@/lib/content/credits';

export function Attribution({
  kind,
  fileUrl,
  aboutHref,
  credit,
  creditLang,
}: {
  /** omitted on index pages, where no single document is being attributed */
  kind?: 'zh' | 'translated';
  /** omitted on index pages: the upstream file link is shown only on a document page */
  fileUrl?: string;
  aboutHref: string;
  /** original-source credit for a doc that is itself a translation of a third-party work */
  credit?: SourceCredit;
  /** language of the page chrome the credit sentence is written in (the UI locale) */
  creditLang?: string;
}) {
  const t = useTranslations('attribution');
  const stop = t('stop');
  return (
    <footer className="attribution ui">
      {credit ? (
        <p className="source-credit" lang={creditLang}>
          {t.rich('sourceCredit', {
            title: credit.title,
            author: credit.author,
            publisher: credit.publisher,
            year: credit.year,
            link: (chunks) => <a href={credit.url}>{chunks}</a>,
          })}
        </p>
      ) : null}
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
