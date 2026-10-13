import type { Locale } from './content/types';

export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function localeCookieString(locale: Locale): string {
  return `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function writeLocaleCookie(locale: Locale, doc: { cookie: string } = document): void {
  doc.cookie = localeCookieString(locale);
}
