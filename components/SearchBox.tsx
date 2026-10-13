'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Locale } from '@/lib/content/types';
import { rankHits } from '@/lib/search/rank';
import type { SearchEngine, SearchHit } from '@/lib/search/types';

const LANG_NAME: Record<Locale, string> = { en: 'English', vi: 'Tiếng Việt', zh: '中文' };

const wrapStyle: CSSProperties = { position: 'relative', flex: '1 1 auto', maxWidth: '24rem' };
const listStyle: CSSProperties = {
  position: 'absolute',
  insetInline: 0,
  top: '100%',
  margin: 0,
  padding: '0.5rem',
  listStyle: 'none',
  background: 'var(--paper)',
  border: '1px solid var(--rule)',
  maxHeight: '60vh',
  overflowY: 'auto',
  zIndex: 10,
};

export function SearchBox({ locale, engine }: { locale: Locale; engine: SearchEngine }) {
  const t = useTranslations('nav');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    let live = true;
    if (!q.trim()) {
      setHits([]);
      return;
    }
    engine
      .search(q, locale)
      .then((r) => live && setHits(rankHits(r).slice(0, 10)))
      .catch(() => live && setHits([]));
    return () => {
      live = false;
    };
  }, [q, locale, engine]);

  return (
    <div className="search ui" style={wrapStyle}>
      <input
        ref={input}
        type="search"
        role="searchbox"
        value={q}
        placeholder={`${t('search')} (⌘K)`}
        aria-label={t('search')}
        style={{ width: '100%' }}
        onFocus={() => engine.warm?.(locale)}
        onChange={(e) => setQ(e.target.value)}
      />
      {hits.length > 0 && (
        <ul className="search-results" style={listStyle}>
          {hits.map((h) => (
            <li key={h.href}>
              <a href={h.href}>
                {h.title}
                {h.fallback && <span className="badge ui-cjk"> {LANG_NAME[h.lang]}</span>}
              </a>
              {h.excerpt && <p style={{ margin: 0 }}>{h.excerpt}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
