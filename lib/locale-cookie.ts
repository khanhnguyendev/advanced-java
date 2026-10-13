import type { Locale } from './content/types';

export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function localeCookieString(
  locale: Locale,
  secure: boolean = typeof location !== 'undefined' && location.protocol === 'https:',
): string {
  return `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax${secure ? '; secure' : ''}`;
}

export function writeLocaleCookie(locale: Locale, doc: { cookie: string } = document): void {
  doc.cookie = localeCookieString(locale);
}
