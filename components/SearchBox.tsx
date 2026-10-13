'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Locale } from '@/lib/content/types';
import { rankHits } from '@/lib/search/rank';
import type { SearchEngine, SearchHit } from '@/lib/search/types';

const LANG_NAME: Record<Locale, string> = { en: 'English', vi: 'Tiếng Việt', zh: '中文' };
const DEBOUNCE_MS = 150;

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
const srOnly: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

export function SearchBox({ locale, engine }: { locale: Locale; engine: SearchEngine }) {
  const t = useTranslations('nav');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(true);
  const [settled, setSettled] = useState(''); // the trimmed query the current hits belong to
  const [hint, setHint] = useState('⌘K');
  const input = useRef<HTMLInputElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Platform is only known on the client; choose the shortcut hint after mount.
    if (!/mac|iphone|ipad/i.test(navigator.platform ?? '')) setHint('Ctrl K');
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
    const query = q.trim();
    if (!query) {
      setHits([]);
      setSettled('');
      return;
    }
    const timer = setTimeout(() => {
      engine
        .search(q, locale)
        .then((r) => {
          if (!live) return;
          setHits(rankHits(r).slice(0, 10));
          setSettled(query);
        })
        .catch(() => {
          if (!live) return;
          setHits([]);
          setSettled(query);
        });
    }, DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q, locale, engine]);

  const shown = open && settled === q.trim() ? hits : [];

  return (
    <div
      ref={wrap}
      className="search ui"
      style={wrapStyle}
      onBlur={(e) => {
        if (!wrap.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setOpen(false);
          setQ('');
          setHits([]);
          input.current?.focus();
        }
      }}
    >
      <input
        ref={input}
        type="search"
        role="searchbox"
        value={q}
        placeholder={`${t('search')} (${hint})`}
        aria-label={t('search')}
        style={{ width: '100%' }}
        onFocus={() => {
          setOpen(true);
          engine.warm?.(locale);
        }}
        onChange={(e) => {
          setOpen(true);
          setQ(e.target.value);
        }}
      />
      <div aria-live="polite" style={srOnly}>
        {q.trim() && shown.length > 0 ? t('resultsCount', { count: shown.length }) : ''}
      </div>
      {shown.length > 0 && (
        // keep input focus on mousedown so the blur handler does not close the popup before the click lands
        <ul className="search-results" style={listStyle} onMouseDown={(e) => e.preventDefault()}>
          {shown.map((h) => (
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
