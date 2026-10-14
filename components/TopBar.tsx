import { useTranslations } from 'next-intl';
import { LanguagePopover } from './LanguagePopover';
import { LanguageSwitcher, type SwitcherItem } from './LanguageSwitcher';
import { SearchBoxClient } from './SearchBoxClient';
import { ReadingModeToggle } from './ReadingModeToggle';
import { ThemeToggle } from './ThemeToggle';
import { TopBarMetrics } from './TopBarMetrics';
import type { Locale } from '@/lib/content/types';

export function TopBar({
  locale,
  collectionId,
  collectionTitle,
  homeHref,
  switcher,
  hasDock = false,
}: {
  locale: Locale;
  collectionId: string;
  collectionTitle: string;
  homeHref: string;
  switcher: SwitcherItem[];
  /** doc pages carry the language control in the bottom dock on <=960px */
  hasDock?: boolean;
}) {
  const t = useTranslations('nav');
  return (
    <header className="topbar">
      <a className="topbar-brand ui" href={homeHref}>
        {collectionTitle}
      </a>
      <div className="topbar-search" role="search" aria-label={t('search')}>
        <SearchBoxClient locale={locale} collection={collectionId} />
      </div>
      <LanguageSwitcher items={switcher} current={locale} />
      {hasDock ? null : <LanguagePopover items={switcher} current={locale} />}
      <div className="topbar-tools">
        <ThemeToggle />
        <ReadingModeToggle />
      </div>
      <TopBarMetrics />
    </header>
  );
}
