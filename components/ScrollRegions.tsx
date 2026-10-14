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
      let codeN = 0;
      let diagramN = 0;
      prose.querySelectorAll<HTMLElement>('pre, .diagram-scroll').forEach((el) => {
        const scrolls = el.scrollWidth > el.clientWidth + 1;
        if (scrolls) {
          const isCode = el.tagName === 'PRE';
          const label = isCode ? `${code} ${(codeN += 1)}` : `${diagram} ${(diagramN += 1)}`;
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
    return () => ro.disconnect();
  }, [code, diagram]);
  return null;
}
