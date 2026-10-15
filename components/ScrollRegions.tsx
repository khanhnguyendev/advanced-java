'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

/**
 * Code blocks and diagrams that scroll sideways become keyboard-focusable regions with a label.
 * Done on the client, only where content actually overflows, so the markdown pipeline stays untouched.
 */
export function ScrollRegions() {
  const t = useTranslations('nav');
  const code = t('scrollCode');
  const diagram = t('scrollDiagram');
  useEffect(() => {
    const prose = document.querySelector('.prose');
    if (!prose) return;
    const mark = () => {
      // number by position among all blocks of the kind, so labels stay stable while diagrams lazy-load
      let codeI = 0;
      let diagramI = 0;
      prose.querySelectorAll<HTMLElement>('pre, .diagram-scroll').forEach((el) => {
        const isCode = el.tagName === 'PRE';
        const n = isCode ? (codeI += 1) : (diagramI += 1);
        const scrolls = el.scrollWidth > el.clientWidth + 1;
        if (scrolls) {
          const label = isCode ? `${code} ${n}` : `${diagram} ${n}`;
          if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
          el.setAttribute('role', 'region');
          el.setAttribute('aria-label', label);
        } else if (el.getAttribute('role') === 'region') {
          el.removeAttribute('tabindex');
          el.removeAttribute('role');
          el.removeAttribute('aria-label');
        }
      });
    };
    mark();
    const ro = new ResizeObserver(mark);
    ro.observe(prose);
    // a lazy diagram was filled in (LazyDiagrams): its width is only known now
    window.addEventListener('diagrams:loaded', mark);
    return () => {
      ro.disconnect();
      window.removeEventListener('diagrams:loaded', mark);
    };
  }, [code, diagram]);
  return null;
}
