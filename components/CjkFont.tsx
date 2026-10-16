'use client';

import { useEffect } from 'react';

type Cjk = typeof import('@/app/fonts-cjk');

/**
 * Noto Serif SC ships ~186 KB of @font-face slices; a static (or next/dynamic) import puts that sheet in the
 * render-blocking CSS of every locale, so the module is imported on the client instead. Mounted by the zh layout and
 * by en/vi doc pages that fall back to zh content. Until it resolves, .prose:lang(zh) uses the system serif
 * (see the --font-cjk fallback in globals.css). On zh pages the import starts at module load, before hydration.
 */
let started: Promise<Cjk> | undefined;
function start(): Promise<Cjk> {
  started ??= import('@/app/fonts-cjk').catch((e) => {
    // a failed chunk load must not be cached: the next caller retries
    started = undefined;
    throw e;
  });
  return started;
}
if (typeof document !== 'undefined' && document.documentElement.lang === 'zh') void start().catch(() => {});

export default function CjkFont() {
  useEffect(() => {
    let live = true;
    void start()
      .then(({ cjk }) => {
        if (live) document.documentElement.style.setProperty('--font-cjk', cjk.style.fontFamily);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return null;
}
