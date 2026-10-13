'use client';

import { useEffect } from 'react';
import { resolveHashInDocument } from '@/lib/anchor';

export function AnchorResolver() {
  useEffect(() => {
    const go = () => {
      if (!window.location.hash) return;
      const el = resolveHashInDocument(document, window.location.hash);
      if (!el) return;
      el.scrollIntoView();
      let current = window.location.hash.slice(1);
      try {
        current = decodeURIComponent(current);
      } catch {
        // keep raw value
      }
      if (el.id && current !== el.id) {
        window.history.replaceState(window.history.state, '', `#${encodeURIComponent(el.id)}`);
      }
    };
    go();
    window.addEventListener('hashchange', go);
    return () => window.removeEventListener('hashchange', go);
  }, []);
  return null;
}
