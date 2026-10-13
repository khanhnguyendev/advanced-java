'use client';

import { useEffect, useRef } from 'react';

/** Publishes the sticky bar's real height as --topbar-h so scroll-margin tracks it. */
export function TopBarMetrics() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const slot = ref.current?.closest('.topbar-slot');
    if (!slot) return;
    const root = document.documentElement;
    const set = () => root.style.setProperty('--topbar-h', `${slot.getBoundingClientRect().height}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(slot);
    return () => {
      ro.disconnect();
      root.style.removeProperty('--topbar-h');
    };
  }, []);
  return <span ref={ref} hidden />;
}
