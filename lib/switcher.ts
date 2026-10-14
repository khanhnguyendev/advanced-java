import { LOCALES, type Locale } from './content/types';
import type { SwitcherItem } from '@/components/LanguageSwitcher';

/** Language switcher items for index pages, where every locale exists. */
export function indexSwitcher(pathAfterLocale: string, label: (l: Locale) => string): SwitcherItem[] {
  return LOCALES.map((l) => ({
    locale: l,
    label: label(l),
    href: `/${l}${pathAfterLocale}`,
  }));
}
