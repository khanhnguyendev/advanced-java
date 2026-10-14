'use client';

import { useTranslations } from 'next-intl';
import { currentHeadingIndex } from '@/lib/anchor';
import type { Locale } from '@/lib/content/types';
import { writeLocaleCookie } from '@/lib/locale-cookie';

export interface SwitcherItem { locale: Locale; label: string; href: string }

export function LanguageSwitcher({
  items,
  current,
  navigate = (url: string) => window.location.assign(url),
}: {
  items: SwitcherItem[];
  current: Locale;
  navigate?: (url: string) => void;
}) {
  const t = useTranslations('doc');
  return (
    <nav aria-label={t('language')} className="lang-switcher">
      <ul>
        {items.map((it) => (
          <li key={it.locale}>
            <a
              href={it.href}
              hrefLang={it.locale === 'zh' ? 'zh-Hans' : it.locale}
              aria-current={it.locale === current ? 'page' : undefined}
              onClick={(e) => {
                const modified = e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
                if (it.locale === current) {
                  // plain click on the current page is a no-op; modified clicks keep the browser default
                  if (!modified) e.preventDefault();
                  return;
                }
                writeLocaleCookie(it.locale);
                if (e.defaultPrevented || modified) return;
                e.preventDefault();
                const idx = currentHeadingIndex(document);
                navigate(idx ? `${it.href.split('#')[0]}#h${idx}` : it.href);
              }}
            >
              <span className="lang-label ui-cjk" lang={it.locale === 'zh' ? 'zh-Hans' : it.locale}>
                {it.label}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
