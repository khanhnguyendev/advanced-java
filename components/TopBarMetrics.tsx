'use client';

import { useEffect } from 'react';

/** Publishes the sticky bar's real height as --topbar-h so scroll-margin tracks it. */
export function TopBarMetrics() {
  useEffect(() => {
    const slot = document.querySelector('.topbar-slot');
    if (!slot) return;
    const set = () => document.documentElement.style.setProperty('--topbar-h', `${slot.getBoundingClientRect().height}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(slot);
    return () => ro.disconnect();
  }, []);
  return null;
}
