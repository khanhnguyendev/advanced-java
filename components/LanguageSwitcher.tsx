'use client';

import { useTranslations } from 'next-intl';
import { currentHeadingIndex } from '@/lib/anchor';
import type { Locale } from '@/lib/content/types';
import { writeLocaleCookie } from '@/lib/locale-cookie';

export type SwitcherStatus = 'translated' | 'machine' | 'fallback';
export interface SwitcherItem { locale: Locale; label: string; status: SwitcherStatus; href: string }

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
  const statusLabel = (s: SwitcherStatus) =>
    s === 'translated' ? t('translated') : s === 'machine' ? t('machineStatus') : t('fallback');

  return (
    <nav aria-label={t('language')} className="lang-switcher">
      <ul>
        {items.map((it) => (
          <li key={it.locale}>
            <a
              href={it.href}
              hrefLang={it.locale === 'zh' ? 'zh-Hans' : it.locale}
              aria-current={it.locale === current ? 'page' : undefined}
              data-status={it.status}
              onClick={(e) => {
                if (it.locale === current) {
                  e.preventDefault();
                  return;
                }
                writeLocaleCookie(it.locale);
                if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                const idx = currentHeadingIndex(document);
                navigate(idx ? `${it.href.split('#')[0]}#h${idx}` : it.href);
              }}
            >
              <span className="lang-label ui-cjk" lang={it.locale === 'zh' ? 'zh-Hans' : it.locale}>
                {it.label}
              </span>
              <span className="lang-status">{statusLabel(it.status)}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
