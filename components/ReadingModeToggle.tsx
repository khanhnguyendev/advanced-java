'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

export function ReadingModeToggle() {
  const t = useTranslations('nav');
  const [on, setOn] = useState(false);
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
