import { useTranslations } from 'next-intl';
import type { SourceCredit } from '@/lib/content/credits';

export function Attribution({
  kind,
  fileUrl,
  aboutHref,
  credit,
  creditLang,
  served,
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
  /** locale of the text actually served; picks the credit sentence that stays true */
  served?: 'en' | 'vi' | 'zh';
}) {
  const t = useTranslations('attribution');
  const stop = t('stop');
  const adapted = credit?.kind === 'adaptation';
  const translatedServed = served === 'en' || served === 'vi';
  const derived = credit?.kind === 'derived';
  const key = derived
    ? translatedServed ? 'sourceCreditDerivedTranslated' : 'sourceCreditDerived'
    : adapted
    ? translatedServed ? 'sourceCreditAdaptedTranslated' : 'sourceCreditAdapted'
    : translatedServed ? 'sourceCreditTranslated' : 'sourceCredit';
  return (
    <footer className="attribution ui">
      {credit ? (
        <p className="source-credit" lang={creditLang}>
          {t.rich(key, {
            title: credit.title,
            author: credit.author,
            publisher: credit.publisher,
            year: credit.year ?? '',
            cite: (chunks) => <cite lang="en">{chunks}</cite>,
            link: (chunks) => <a href={credit.url}>{chunks}</a>,
          })}
          {adapted && credit.license ? (
            <>
              {' '}
              {t.rich('sourceCreditLicense', {
                license: credit.license.name,
                licenseLink: (chunks) => <a href={credit.license!.url}>{chunks}</a>,
              })}
            </>
          ) : null}
        </p>
      ) : null}
      <p>
        {credit ? (
          t(credit.kind === 'derived' ? 'licenseDerived' : 'licenseCredited')
        ) : (
          <>
            <a href="https://creativecommons.org/licenses/by-sa/4.0/">{t('license')}</a>
            {stop}
            {t('credit')}
          </>
        )}
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
