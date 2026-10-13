import { useTranslations } from 'next-intl';
import { LanguageSwitcher, type SwitcherItem } from './LanguageSwitcher';
import { SearchBoxClient } from './SearchBoxClient';
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
  collectionId: string;
  collectionTitle: string;
  homeHref: string;
  switcher: SwitcherItem[];
}) {
  const t = useTranslations('nav');
  return (
    <header className="topbar">
      <a className="ui" href={homeHref}>
        {collectionTitle}
      </a>
      <div role="search" aria-label={t('search')}>
        <SearchBoxClient locale={locale} collection={collectionId} />
      </div>
      <LanguageSwitcher items={switcher} current={locale} />
      <ThemeToggle />
      <ReadingModeToggle />
    </header>
  );
}
