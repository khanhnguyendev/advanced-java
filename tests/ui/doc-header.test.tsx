// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import { DocHeader } from '@/components/DocHeader';
import en from '../../messages/en.json';

afterEach(cleanup);

const wrap = (ui: React.ReactElement) => (
  <NextIntlClientProvider locale="en" messages={en}>
    {ui}
  </NextIntlClientProvider>
);

describe('DocHeader', () => {
  it('shows id and title and no notices for the source language', () => {
    render(wrap(<DocHeader catalogId="HC-03" title="Why MQ" notices={[]} requestedName="中文" servedName="中文" originalHref="/x" />));
    expect(screen.getByText('HC-03')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Why MQ');
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('names both languages in the fallback notice', () => {
    render(wrap(<DocHeader catalogId="HC-03" title="t" notices={['fallback']} requestedName="Tiếng Việt" servedName="中文" originalHref="/x" />));
    expect(screen.getByRole('note').textContent).toBe(
      'This page is not translated into Tiếng Việt yet. Showing the 中文 original.',
    );
  });

  it('shows the machine note and a stale note with a link to the original', () => {
    render(wrap(<DocHeader catalogId="HC-03" title="t" notices={['machine', 'stale']} requestedName="English" servedName="English" originalHref="https://example.com/u" />));
    const notes = screen.getAllByRole('note').map((n) => n.textContent ?? '');
    expect(notes[0]).toBe('Machine translated, may contain errors.');
    expect(notes[1]).toContain('The Chinese original was updated after this translation');
    expect(screen.getByRole('link', { name: 'View original' }).getAttribute('href')).toBe('https://example.com/u');
  });
});
