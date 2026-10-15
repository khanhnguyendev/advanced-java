import type { SourceCredit } from './content/credits';

export type ServedLocale = 'en' | 'vi' | 'zh';

/** i18n keys (namespace "attribution") for the visible credit sentence and the license sentence. Shared by Attribution and JSON-LD. */
export function creditKeys(credit: SourceCredit, served?: ServedLocale): { source: string; license: string } {
  const translated = served === 'en' || served === 'vi';
  const kind = credit.kind ?? 'translation';
  const source =
    kind === 'derived'
      ? translated ? 'sourceCreditDerivedTranslated' : 'sourceCreditDerived'
      : kind === 'adaptation'
      ? translated ? 'sourceCreditAdaptedTranslated' : 'sourceCreditAdapted'
      : translated ? 'sourceCreditTranslated' : 'sourceCredit';
  return { source, license: kind === 'derived' ? 'licenseDerived' : 'licenseCredited' };
}

/** The values the credit sentence interpolates. */
export function creditValues(credit: SourceCredit) {
  return { title: credit.title, author: credit.author, publisher: credit.publisher, year: credit.year ?? '' };
}

export interface PlainTranslator {
  (key: string, values?: Record<string, string | number>): string;
  markup(key: string, values: Record<string, string | number | ((chunks: string) => string)>): string;
}

/** Plain-text form of what the visible Attribution says about a credited source: source sentence, original license, license sentence. */
export function creditPlainText(t: PlainTranslator, credit: SourceCredit, served?: ServedLocale): string {
  const keys = creditKeys(credit, served);
  const plain = (chunks: string) => chunks;
  const parts = [t.markup(keys.source, { ...creditValues(credit), cite: plain, link: plain })];
  if (credit.kind === 'adaptation' && credit.license) {
    parts.push(t.markup('sourceCreditLicense', { license: credit.license.name, licenseLink: plain }));
  }
  parts.push(t(keys.license));
  // the visible sentences sit in separate paragraphs; a full stop keeps the joined text readable
  return parts.map((p, i) => (i < parts.length - 1 && !/[.!?。！？]$/.test(p) ? p + '.' : p)).join(' ');
}
