// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { Shelf } from '@/components/Shelf';
import en from '../../messages/en.json';

describe('Shelf', () => {
  it('renders one notebook per collection with per-locale counts and links', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <Shelf
          locale="en"
          items={[{ collection: 'advanced-java', title: 'advanced-java', tabColor: '#2f5bea', total: 81, perLocale: { en: 3, vi: 5, zh: 81 } }]}
        />
      </NextIntlClientProvider>,
    );
    const link = screen.getByRole('link', { name: /advanced-java/ });
    expect(link.getAttribute('href')).toBe('/en/advanced-java');
    expect(screen.getByText('3 / 81')).toBeTruthy();
    expect(screen.getByText('81 / 81')).toBeTruthy();
  });
});
