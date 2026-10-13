import { useTranslations } from 'next-intl';
import { LanguageSwitcher, type SwitcherItem } from './LanguageSwitcher';
import { ReadingModeToggle } from './ReadingModeToggle';
import { ThemeToggle } from './ThemeToggle';
import type { Locale } from '@/lib/content/types';

export function TopBar({
  locale,
  collectionId,
  collectionTitle,
  homeHref,
  switcher,
}: {
  locale: Locale;
  collectionId: string; // used by the search box (Task 24)
  collectionTitle: string;
  homeHref: string;
  switcher: SwitcherItem[];
}) {
  const t = useTranslations('nav');
  return (
    <header className="topbar" data-collection={collectionId}>
      <a className="ui" href={homeHref}>
        {collectionTitle}
      </a>
      <div id="search-slot" aria-label={t('search')} />
      <LanguageSwitcher items={switcher} current={locale} />
      <ThemeToggle />
      <ReadingModeToggle />
    </header>
  );
}
