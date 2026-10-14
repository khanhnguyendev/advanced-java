// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { MobileDock } from '@/components/MobileDock';
import { Sidebar } from '@/components/Sidebar';
import type { NavSection } from '@/lib/nav';
import en from '../../messages/en.json';

const wrap = (n: React.ReactNode) => (
  <NextIntlClientProvider locale="en" messages={en}>
    {n}
  </NextIntlClientProvider>
);
afterEach(cleanup);

const nav: NavSection[] = ['a', 'b'].map((id) => ({
  id,
  title: `Section ${id}`,
  groups: [
    {
      id: 'g',
      title: 'G',
      docs: [{ slug: `${id}-doc`, catalogId: `${id.toUpperCase()}-01`, title: `Doc ${id}`, href: `/en/c/${id}/${id}-doc` }],
    },
  ],
}));

describe('MobileDock', () => {
  // jsdom has no showModal/close: stub them, including the close event the browser dispatches
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  });
  const switcher = [
    { locale: 'en' as const, label: 'English', href: '/en/c/a/a-doc' },
    { locale: 'vi' as const, label: 'Tiếng Việt', href: '/vi/c/a/a-doc', status: 'machine' as const },
    { locale: 'zh' as const, label: '中文', href: '/zh/c/a/a-doc', status: 'fallback' as const },
  ];
  it('renders prev/next links, disables a missing side, and exposes the three openers', () => {
    render(
      wrap(
        <MobileDock
          next={{ href: '/en/c/a/n', title: 'N' }}
          switcher={switcher}
          current="en"
          drawer={<p>drawer</p>}
          sheet={<p>sheet</p>}
        />,
      ),
    );
    const dock = screen.getByRole('navigation', { name: 'Page navigation' });
    expect(dock.querySelector('a[rel="next"]')?.getAttribute('href')).toBe('/en/c/a/n');
    expect(dock.querySelector('a[rel="prev"]')).toBeNull();
    expect(dock.querySelector('span.dock-item')?.textContent).toBe('Previous');
    expect(dock.querySelector('a[rel="next"]')?.getAttribute('aria-label')).toBe('Next: N');
    for (const name of ['Language', 'Contents', 'Menu']) {
      expect(Array.from(dock.querySelectorAll('button')).some((b) => b.textContent === name)).toBe(true);
    }
  });
  it('opens a dialog from the button, closes it and returns focus to the opener', () => {
    render(
      wrap(<MobileDock switcher={switcher} current="en" drawer={<p>drawer</p>} sheet={<p>sheet</p>} />),
    );
    const menu = screen.getByRole('button', { name: 'Menu' });
    menu.focus();
    fireEvent.click(menu);
    expect(document.querySelectorAll('dialog[open]')).toHaveLength(1);
    fireEvent.click(document.querySelector('dialog[open] .sheet-close')!);
    expect(document.querySelectorAll('dialog[open]')).toHaveLength(0);
    expect(document.activeElement).toBe(menu);
  });
});

describe('Sidebar', () => {
  it('opens only the current section and leaves the others as closed details', () => {
    render(wrap(<Sidebar nav={nav} currentSlug="b-doc" />));
    const d = document.querySelectorAll('details');
    expect(d).toHaveLength(2);
    expect(d[0].hasAttribute('open')).toBe(false);
    expect(d[1].hasAttribute('open')).toBe(true);
    expect(document.querySelector('[aria-current="page"]')?.textContent).toContain('Doc b');
  });
  it('opens every section when nothing is current', () => {
    render(wrap(<Sidebar nav={nav} currentSlug="" />));
    expect(document.querySelectorAll('details[open]')).toHaveLength(2);
  });
});
