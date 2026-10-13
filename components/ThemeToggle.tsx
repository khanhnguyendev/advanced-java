'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

function apply(theme: Theme) {
  const el = document.documentElement;
  if (theme === 'system') el.removeAttribute('data-theme');
  else el.setAttribute('data-theme', theme);
  try {
    window.localStorage.setItem('theme', theme);
  } catch {
    /* storage unavailable: theme still applies for this page */
  }
}

export function ThemeToggle() {
  const t = useTranslations('nav');
  const [theme, setTheme] = useState<Theme>('system');
  // Start as 'system' so server and first client render match, then adopt the saved choice.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch {
      /* storage unavailable: keep 'system' */
    }
  }, []);
  const next: Theme = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
  return (
    <button
      type="button"
      className="ui"
      onClick={() => {
        apply(next);
        setTheme(next);
      }}
    >
      {t('theme')}: {t(`themeValue.${theme}`)}
    </button>
  );
}
