'use client';

import { useLayoutEffect, useRef } from 'react';

/**
 * Fills itself with deep clones of the already-rendered desktop rails (matched by `selector`) each time `open`
 * turns true, so the mobile dialogs reuse the server-rendered nav/TOC instead of shipping a second copy.
 * ids are stripped from the clones to keep the document free of duplicate ids; aria-current is kept.
 * Limits: clones are rebuilt on every open, so <details> toggles in the drawer are not persisted across opens,
 * and React event handlers attached to rail content are not carried into the clone (cloneNode copies DOM only).
 */
export function CloneOnOpen({ selector, open }: { selector: string; open: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  // layout effect: runs before ModalDialog's open effect, so scrollCurrentIntoView sees the clone
  useLayoutEffect(() => {
    const el = host.current;
    if (!open || !el) return;
    const clones = Array.from(document.querySelectorAll(selector)).map((src) => {
      const c = src.cloneNode(true) as Element;
      c.removeAttribute('id');
      c.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      return c;
    });
    el.replaceChildren(...clones);
  }, [open, selector]);
  return <div ref={host} className="clone-host" />;
}
