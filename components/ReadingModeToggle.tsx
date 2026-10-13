'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export function ReadingModeToggle() {
  const t = useTranslations('nav');
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(document.documentElement.getAttribute('data-reading') === 'on');
  }, []);
  return (
    <button
      type="button"
      className="ui"
      aria-pressed={on}
      onClick={() => {
        const next = !on;
        setOn(next);
        if (next) document.documentElement.setAttribute('data-reading', 'on');
        else document.documentElement.removeAttribute('data-reading');
      }}
    >
      {t('readingMode')}
    </button>
  );
}
