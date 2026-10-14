'use client';

import { useEffect } from 'react';

/** Keeps the current doc row visible inside the sticky left rail (scrolls the rail only, never the page). */
export function CurrentDocScroll() {
  useEffect(() => {
    const cur = document.querySelector<HTMLElement>('.shell > .rail [aria-current="page"]');
    const rail = cur?.closest<HTMLElement>('.rail');
    if (!cur || !rail) return;
    const cr = cur.getBoundingClientRect();
    const rr = rail.getBoundingClientRect();
    if (cr.top < rr.top || cr.bottom > rr.bottom) {
      rail.scrollTop += cr.top - rr.top - rr.height / 2 + cr.height / 2;
    }
  }, []);
  return null;
}
