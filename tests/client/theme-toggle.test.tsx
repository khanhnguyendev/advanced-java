// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadingModeToggle } from '@/components/ReadingModeToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import en from '../../messages/en.json';

const wrap = (ui: React.ReactElement) => (
  <NextIntlClientProvider locale="en" messages={en}>
    {ui}
  </NextIntlClientProvider>
);

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-reading');
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('adopts the saved theme so the first click advances from it', () => {
    window.localStorage.setItem('theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    render(wrap(<ThemeToggle />));
    const btn = screen.getByRole('button', { name: /Theme: Dark/ });
    fireEvent.click(btn);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem('theme')).toBe('light');
  });

  it('reads the applied data-theme, not storage, for the initial value', () => {
    window.localStorage.setItem('theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'light');
    render(wrap(<ThemeToggle />));
    expect(screen.getByRole('button', { name: /Theme: Light/ })).toBeTruthy();
  });

  it('removes the stored key when switching to system', () => {
    window.localStorage.setItem('theme', 'light');
    document.documentElement.setAttribute('data-theme', 'light');
    render(wrap(<ThemeToggle />));
    fireEvent.click(screen.getByRole('button', { name: /Theme: Light/ }));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(window.localStorage.getItem('theme')).toBeNull();
  });

  it('does not crash when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    render(wrap(<ThemeToggle />));
    fireEvent.click(screen.getByRole('button', { name: /Theme: System/ }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});

describe('ReadingModeToggle', () => {
  it('reflects an already-active reading mode', () => {
    document.documentElement.setAttribute('data-reading', 'on');
    render(wrap(<ReadingModeToggle />));
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
    document.documentElement.removeAttribute('data-reading');
  });
});
