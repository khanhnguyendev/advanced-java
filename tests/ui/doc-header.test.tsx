// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DocHeader } from '@/components/DocHeader';

afterEach(cleanup);

describe('DocHeader', () => {
  it('shows id and title and no notices', () => {
    render(<DocHeader catalogId="HC-03" title="Why MQ" titleLang="zh-Hans" />);
    expect(screen.getByText('HC-03')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Why MQ');
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('sets the content language on the title', () => {
    render(<DocHeader catalogId="HC-03" title="为什么用 MQ" titleLang="zh-Hans" />);
    expect(screen.getByRole('heading', { level: 1 }).getAttribute('lang')).toBe('zh-Hans');
  });

  it('omits lang on the title when only the slug is known', () => {
    render(<DocHeader catalogId="HC-03" title="intro" />);
    expect(screen.getByRole('heading', { level: 1 }).hasAttribute('lang')).toBe(false);
  });
});
