'use client';

import { useMemo } from 'react';
import type { Locale } from '@/lib/content/types';
import { pagefindEngine } from '@/lib/search/pagefind';
import { SearchBox } from './SearchBox';

export function SearchBoxClient({ locale, collection }: { locale: Locale; collection: string }) {
  const engine = useMemo(() => pagefindEngine(collection), [collection]);
  return <SearchBox locale={locale} engine={engine} />;
}
