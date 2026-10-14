'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { LanguageSwitcher, type SwitcherItem } from './LanguageSwitcher';
import { ModalDialog } from './ModalDialog';
import { ThemeToggle } from './ThemeToggle';
import type { Locale } from '@/lib/content/types';

/** Topbar language button for <=960px pages without a dock (home, collection, section, about); the dialog footer also carries Theme. */
export function LanguagePopover({ items, current }: { items: SwitcherItem[]; current: Locale }) {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    // the trigger is hidden above 960px; never leave a modal open behind it
    const mq = window.matchMedia?.('(min-width: 961px)');
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return (
    <>
      <div className="topbar-lang-mobile">
      <button
        type="button"
        className="ui"
        aria-haspopup="dialog"
        aria-label={`${current.toUpperCase()}, ${t('language')}`}
        onClick={(e) => {
          opener.current = e.currentTarget;
          setOpen(true);
        }}
      >
        {current.toUpperCase()}
      </button>
      </div>
      <ModalDialog
        open={open}
        onClose={() => setOpen(false)}
        label={t('language')}
        closeLabel={t('close')}
        variant="popover"
        openerRef={opener}
        footer={<ThemeToggle />}
      >
        <LanguageSwitcher items={items} current={current} />
      </ModalDialog>
    </>
  );
}
