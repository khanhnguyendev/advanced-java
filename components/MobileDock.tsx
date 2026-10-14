'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { LanguageSwitcher, type SwitcherItem } from './LanguageSwitcher';
import { ModalDialog } from './ModalDialog';
import { ThemeToggle } from './ThemeToggle';
import type { Locale } from '@/lib/content/types';

type Which = 'lang' | 'contents' | 'menu' | null;

/** Fixed bottom bar for <=960px doc pages: prev, next, language, contents (bottom sheet), menu (drawer). */
export function MobileDock({
  prev,
  next,
  switcher,
  current,
  drawer,
  sheet,
}: {
  prev?: { href: string; title: string };
  next?: { href: string; title: string };
  switcher: SwitcherItem[];
  current: Locale;
  drawer: React.ReactNode;
  sheet: React.ReactNode;
}) {
  const t = useTranslations('nav');
  const [which, setWhich] = useState<Which>(null);
  const close = () => setWhich(null);
  useEffect(() => {
    // the dock is hidden above 960px; never leave a modal open behind it
    const mq = window.matchMedia?.('(min-width: 961px)');
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setWhich(null);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const opener = useRef<HTMLElement | null>(null);
  const open = (w: Exclude<Which, null>) => (e: React.MouseEvent<HTMLButtonElement>) => {
    opener.current = e.currentTarget;
    setWhich(w);
  };
  return (
    <>
      <nav className="dock ui" aria-label={t('pageNav')}>
        {prev ? (
          <a className="dock-item" rel="prev" href={prev.href} aria-label={`${t('previous')}: ${prev.title}`}>
            {t('previous')}
          </a>
        ) : (
          <span className="dock-item">
            {t('previous')}
          </span>
        )}
        {next ? (
          <a className="dock-item" rel="next" href={next.href} aria-label={`${t('next')}: ${next.title}`}>
            {t('next')}
          </a>
        ) : (
          <span className="dock-item">
            {t('next')}
          </span>
        )}
        <button type="button" className="dock-item" aria-haspopup="dialog" onClick={open('lang')}>
          {t('language')}
        </button>
        <button type="button" className="dock-item" aria-haspopup="dialog" onClick={open('contents')}>
          {t('contents')}
        </button>
        <button type="button" className="dock-item" aria-haspopup="dialog" onClick={open('menu')}>
          {t('menu')}
        </button>
      </nav>
      <ModalDialog
        open={which === 'lang'}
        onClose={close}
        label={t('language')}
        closeLabel={t('close')}
        openerRef={opener}
        variant="popover"
      >
        <LanguageSwitcher items={switcher} current={current} />
      </ModalDialog>
      <ModalDialog
        open={which === 'contents'}
        onClose={close}
        label={t('contents')}
        closeLabel={t('close')}
        openerRef={opener}
        variant="sheet"
        closeOnLinkTap
      >
        {sheet}
      </ModalDialog>
      <ModalDialog
        open={which === 'menu'}
        onClose={close}
        label={t('sidebar')}
        closeLabel={t('close')}
        openerRef={opener}
        variant="drawer"
        closeOnLinkTap
        scrollCurrentIntoView
        footer={<ThemeToggle />}
      >
        {drawer}
      </ModalDialog>
    </>
  );
}
