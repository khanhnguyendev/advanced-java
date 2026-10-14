'use client';

import { useEffect, useRef } from 'react';

/**
 * Native <dialog> opened with showModal(): focus trap, Esc to close and focus return come from the browser.
 * `variant` only selects the CSS placement (drawer, sheet, popover).
 */
export function ModalDialog({
  open,
  onClose,
  label,
  variant,
  closeLabel,
  children,
  footer,
  closeOnLinkTap = false,
  scrollCurrentIntoView = false,
  openerRef,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  variant: 'drawer' | 'sheet' | 'popover';
  closeLabel: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnLinkTap?: boolean;
  scrollCurrentIntoView?: boolean;
  /** Element that opened the dialog, set from the click handler (document.activeElement is unreliable in Safari). */
  openerRef?: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  /** id of the heading a tapped #hash link points at; focus goes there instead of the opener */
  const hashTarget = useRef<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = openerRef?.current ?? (document.activeElement as HTMLElement | null);
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
      if (scrollCurrentIntoView) {
        const cur = d.querySelector<HTMLElement>('[aria-current="page"]');
        const body = d.querySelector<HTMLElement>('.sheet-body');
        if (cur && body) {
          const cr = cur.getBoundingClientRect();
          const br = body.getBoundingClientRect();
          body.scrollTop += cr.top - br.top - br.height / 2 + cr.height / 2;
        }
      }
    } else if (!open && d.open) {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
    }
  }, [open, scrollCurrentIntoView, openerRef]);

  const finish = () => {
    onClose();
    const el = opener.current;
    const hash = hashTarget.current;
    opener.current = null;
    hashTarget.current = null;
    if (hash) {
      let id = hash;
      try {
        id = decodeURIComponent(hash);
      } catch {
        /* keep the raw fragment */
      }
      const heading = document.getElementById(id);
      if (heading) {
        if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
        return;
      }
    }
    if (el && el.isConnected) el.focus();
  };

  const shut = () => {
    const d = ref.current;
    if (!d) return;
    if (typeof d.close === 'function') d.close();
    else {
      d.removeAttribute('open');
      finish();
    }
  };

  return (
    <dialog
      ref={ref}
      className={`sheet sheet-${variant} ui`}
      aria-label={label}
      onClose={finish}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target === e.currentTarget) shut();
        else if (closeOnLinkTap) {
          const a = target.closest('a[href]');
          if (a) {
            const href = a.getAttribute('href') ?? '';
            hashTarget.current = href.length > 1 && href.startsWith('#') ? href.slice(1) : null;
            shut();
          }
        }
      }}
    >
      <div className="sheet-head">
        <h2 className="sheet-title">{label}</h2>
        <button type="button" className="sheet-close ui" onClick={() => shut()}>
          {closeLabel}
        </button>
      </div>
      <div className="sheet-body">{children}</div>
      {footer ? <div className="sheet-foot">{footer}</div> : null}
    </dialog>
  );
}
