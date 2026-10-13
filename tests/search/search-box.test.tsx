// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import { SearchBox } from '@/components/SearchBox';
import type { SearchEngine, SearchHit } from '@/lib/search/types';
import en from '../../messages/en.json';

afterEach(cleanup);

const engine: SearchEngine = {
  async search(q) {
    if (q !== 'queue') return [];
    return [
      { slug: 'why-mq', section: 'hc', title: 'Why MQ', excerpt: 'message queue', lang: 'vi', fallback: false, href: '/vi/c/hc/why-mq', score: 2 },
      { slug: 'mq-design', section: 'hc', title: '如何设计一个消息队列', excerpt: '', lang: 'zh', fallback: true, href: '/vi/c/hc/mq-design', score: 1 },
    ] satisfies SearchHit[];
  },
};

const wrap = () =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SearchBox locale="vi" engine={engine} />
    </NextIntlClientProvider>,
  );

describe('SearchBox', () => {
  it('shows results and badges fallback-language hits', async () => {
    wrap();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'queue' } });
    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(2));
    const links = screen.getAllByRole('link');
    expect(links[0].getAttribute('href')).toBe('/vi/c/hc/why-mq');
    expect(links[1].textContent).toContain('中文');
  });
  it('shows nothing for an empty or unmatched query', async () => {
    wrap();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    await waitFor(() => expect(screen.queryAllByRole('link')).toHaveLength(0));
  });
  it('swallows engine failures', async () => {
    const bad: SearchEngine = { search: () => Promise.reject(new Error('boom')) };
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SearchBox locale="vi" engine={bad} />
      </NextIntlClientProvider>,
    );
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'queue' } });
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
