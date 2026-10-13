// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import en from '../../messages/en.json';

const items = [
  { locale: 'en' as const, label: 'English', status: 'translated' as const, href: '/en/c/a/x' },
  { locale: 'vi' as const, label: 'Tiếng Việt', status: 'machine' as const, href: '/vi/c/a/x' },
  { locale: 'zh' as const, label: '中文', status: 'fallback' as const, href: '/zh/c/a/x' },
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

  it('lists every locale with its status', () => {
    render(wrap(<LanguageSwitcher items={items} current="en" />));
    expect(screen.getByRole('link', { name: /Tiếng Việt/ }).textContent).toContain('Machine translated');
    expect(screen.getByRole('link', { name: /中文/ }).textContent).toContain('Not translated');
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
});
