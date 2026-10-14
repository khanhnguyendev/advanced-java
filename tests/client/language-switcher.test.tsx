// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import en from '../../messages/en.json';

const items = [
  { locale: 'en' as const, label: 'English', href: '/en/c/a/x' },
  { locale: 'vi' as const, label: 'Tiếng Việt', href: '/vi/c/a/x' },
  { locale: 'zh' as const, label: '中文', href: '/zh/c/a/x' },
];

function wrap(ui: React.ReactElement) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    document.cookie = 'NEXT_LOCALE=; max-age=0; path=/';
    document.body.innerHTML = '';
  });

  it('lists every locale by name only, with no status marker or text', () => {
    render(wrap(<LanguageSwitcher items={items} current="en" />));
    expect(screen.getByRole('link', { name: 'Tiếng Việt' }).textContent).toBe('Tiếng Việt');
    expect(screen.getByRole('link', { name: '中文' }).textContent).toBe('中文');
    expect(document.querySelector('.lang-marker, .lang-status, [data-status]')).toBeNull();
  });

  it('writes the locale cookie and navigates keeping the heading position', () => {
    const h = document.createElement('h2');
    h.setAttribute('data-hi', '4');
    h.getBoundingClientRect = () => ({ top: 10 }) as DOMRect;
    document.body.appendChild(h);
    const navigate = vi.fn();
    render(wrap(<LanguageSwitcher items={items} current="en" navigate={navigate} />));
    fireEvent.click(screen.getByRole('link', { name: /Tiếng Việt/ }));
    expect(document.cookie).toContain('NEXT_LOCALE=vi');
    expect(navigate).toHaveBeenCalledWith('/vi/c/a/x#h4');
  });

  it('navigates without a hash when no heading is above the fold', () => {
    const navigate = vi.fn();
    render(wrap(<LanguageSwitcher items={items} current="en" navigate={navigate} />));
    fireEvent.click(screen.getByRole('link', { name: /中文/ }));
    expect(navigate).toHaveBeenCalledWith('/zh/c/a/x');
  });

  it('does not hijack modified clicks but still writes the cookie', () => {
    const navigate = vi.fn();
    render(wrap(<LanguageSwitcher items={items} current="en" navigate={navigate} />));
    const link = screen.getByRole('link', { name: /Tiếng Việt/ });
    const ctrl = fireEvent.click(link, { ctrlKey: true });
    expect(ctrl).toBe(true);
    expect(fireEvent.click(link, { metaKey: true })).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    expect(document.cookie).toContain('NEXT_LOCALE=vi');
  });

  it('does nothing when clicking the current locale', () => {
    const navigate = vi.fn();
    render(wrap(<LanguageSwitcher items={items} current="en" navigate={navigate} />));
    const link = screen.getByRole('link', { name: /English/ });
    expect(link.getAttribute('aria-current')).toBe('page');
    fireEvent.click(link);
    expect(navigate).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain('NEXT_LOCALE=en');
  });

  it('leaves modified and non-primary clicks on the current locale to the browser', () => {
    const navigate = vi.fn();
    render(wrap(<LanguageSwitcher items={items} current="en" navigate={navigate} />));
    const link = screen.getByRole('link', { name: /English/ });
    for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
      expect(fireEvent.click(link, init)).toBe(true); // not default-prevented
    }
    expect(fireEvent.click(link)).toBe(false); // plain click stays a no-op
    expect(navigate).not.toHaveBeenCalled();
    expect(document.cookie).not.toContain('NEXT_LOCALE=en');
  });

  it('puts lang on the label and hrefLang on the link', () => {
    render(wrap(<LanguageSwitcher items={items} current="en" />));
    const link = screen.getByRole('link', { name: /中文/ });
    expect(link.getAttribute('hreflang')).toBe('zh-Hans');
    expect(link.hasAttribute('lang')).toBe(false);
    expect(link.querySelector('.lang-label')?.getAttribute('lang')).toBe('zh-Hans');
  });

  it('marks only the current locale with aria-current', () => {
    render(wrap(<LanguageSwitcher items={items} current="en" />));
    expect(screen.getByRole('link', { name: 'English' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Tiếng Việt' }).hasAttribute('aria-current')).toBe(false);
  });
});
