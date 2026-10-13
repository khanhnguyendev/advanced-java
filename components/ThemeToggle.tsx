'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

function apply(theme: Theme) {
  const el = document.documentElement;
  if (theme === 'system') el.removeAttribute('data-theme');
  else el.setAttribute('data-theme', theme);
  try {
    if (theme === 'system') window.localStorage.removeItem('theme');
    else window.localStorage.setItem('theme', theme);
  } catch {
    /* storage unavailable: theme still applies for this page */
  }
}

export function ThemeToggle() {
  const t = useTranslations('nav');
  const [theme, setTheme] = useState<Theme>('system');
  // Start as 'system' so server and first client render match, then adopt what the
  // pre-hydration script already applied to <html>.
  useEffect(() => {
    const applied = document.documentElement.getAttribute('data-theme');
    if (applied === 'light' || applied === 'dark') setTheme(applied);
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
