// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { Shelf } from '@/components/Shelf';
import en from '../../messages/en.json';

describe('Shelf', () => {
  it('renders one notebook per collection with a link', () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <Shelf
          locale="en"
          items={[{ collection: 'advanced-java', title: 'advanced-java', tabColor: '#2f5bea' }]}
        />
      </NextIntlClientProvider>,
    );
    const link = screen.getByRole('link', { name: /advanced-java/ });
    expect(link.getAttribute('href')).toBe('/en/advanced-java');
    expect(screen.queryByText(/\d+ \/ \d+/)).toBeNull();
  });
});
