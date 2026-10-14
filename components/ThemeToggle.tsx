'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

function read(): Theme {
  const v = document.documentElement.getAttribute('data-theme');
  return v === 'light' || v === 'dark' ? v : 'system';
}

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
  // Start as 'system' so server and first client render match, then follow <html>: the
  // pre-hydration script sets it first, and other toggle instances change it later.
  useEffect(() => {
    setTheme(read());
    const mo = new MutationObserver(() => setTheme(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  const next: Theme = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
  return (
    <button type="button" className="ui" onClick={() => apply(next)}>
      {t('theme')}: {t(`themeValue.${theme}`)}
    </button>
  );
}
