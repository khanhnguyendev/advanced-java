'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

const read = () => document.documentElement.getAttribute('data-reading') === 'on';

export function ReadingModeToggle() {
  const t = useTranslations('nav');
  const [on, setOn] = useState(false);
  // Follow <html> so duplicated toggles never go stale.
  useEffect(() => {
    setOn(read());
    const mo = new MutationObserver(() => setOn(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-reading'] });
    return () => mo.disconnect();
  }, []);
  return (
    <button
      type="button"
      className="ui"
      aria-pressed={on}
      onClick={() => {
        const next = !read();
        if (next) document.documentElement.setAttribute('data-reading', 'on');
        else document.documentElement.removeAttribute('data-reading');
        try {
          if (next) window.localStorage.setItem('reading', 'on');
          else window.localStorage.removeItem('reading');
        } catch {
          /* storage unavailable: reading mode still applies for this page */
        }
      }}
    >
      {t('readingMode')}
    </button>
  );
}
