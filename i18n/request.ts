import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { deepMerge } from '@/lib/messages';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const en = (await import('../messages/en.json')).default;
  const own = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages: deepMerge(en, own) };
});
