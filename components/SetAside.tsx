'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { asideKey, readAside, safeStorage, toggleAside } from '@/lib/resume';

export function SetAside({ collection, catalogId }: { collection: string; catalogId: string }) {
  const t = useTranslations('resume');
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(readAside(safeStorage(), asideKey(collection)).includes(catalogId));
  }, [collection, catalogId]);
  return (
    <button
      type="button"
      className="ui"
      aria-pressed={on}
      onClick={() => setOn(toggleAside(safeStorage(), asideKey(collection), catalogId).includes(catalogId))}
    >
      {t('setAside')}
    </button>
  );
}
