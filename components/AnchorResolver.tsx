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
      if (el.id && window.location.hash !== `#${el.id}`) {
        window.history.replaceState(null, '', `#${el.id}`);
      }
    };
    go();
    window.addEventListener('hashchange', go);
    return () => window.removeEventListener('hashchange', go);
  }, []);
  return null;
}
