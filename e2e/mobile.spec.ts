import { expect, test, type Page } from '@playwright/test';
import { PILOT, sectionOf } from './helpers';

const C = '/en/advanced-java';
const SHARD = `${C}/${sectionOf('database-shard')}/database-shard`;
const CODE = `${C}/${sectionOf('distributed-lock-redis-vs-zookeeper')}/distributed-lock-redis-vs-zookeeper`;
const PILOT_URL = (l: string) => `/${l}/advanced-java/${sectionOf(PILOT)}/${PILOT}`;

test.use({ viewport: { width: 390, height: 844 } });

async function noHScroll(page: Page) {
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(m.sw, `scrollWidth ${m.sw} vs innerWidth ${m.iw}`).toBeLessThanOrEqual(m.iw);
}

for (const [name, url] of [
  ['home', '/en'],
  ['database-shard', SHARD],
  ['distributed-lock-redis-vs-zookeeper', CODE],
] as const) {
  test(`${name}: no horizontal page scroll at 390px`, async ({ page }) => {
    await page.goto(url);
    await noHScroll(page);
  });
}

test('doc page: topbar is one row at --topbar-h and fixed to the top', async ({ page }) => {
  await page.goto(CODE);
  const m = await page.evaluate(() => {
    const bar = document.querySelector('.topbar')!.getBoundingClientRect();
    const probe = document.createElement('div');
    probe.style.height = 'var(--topbar-h)';
    document.body.appendChild(probe);
    const v = probe.getBoundingClientRect().height;
    probe.remove();
    return { h: bar.height, v };
  });
  expect(m.h).toBeLessThanOrEqual(m.v + 0.5);
  expect(m.h).toBeLessThanOrEqual(60);
  await page.evaluate(() => window.scrollTo(0, 600));
  const top = await page.locator('.topbar-slot').evaluate((e) => e.getBoundingClientRect().top);
  expect(top).toBe(0);
});

test('doc page: dock controls, topbar controls and pre scroll inside themselves', async ({ page }) => {
  await page.goto(CODE);
  const dock = page.locator('.dock');
  await expect(dock).toBeVisible();
  for (const name of ['Language', 'Contents', 'Menu']) {
    await expect(dock.getByRole('button', { name })).toBeVisible();
  }
  const sizes = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('.dock .dock-item, .topbar input[type="search"], .topbar-brand, .topbar-lang-mobile button'))
      .filter((e) => e.getBoundingClientRect().width > 0)
      .map((e) => {
        const r = e.getBoundingClientRect();
        return { cls: e.className, w: r.width, h: r.height };
      }),
  );
  expect(sizes.length).toBeGreaterThanOrEqual(6);
  for (const s of sizes) expect(s.h, JSON.stringify(s)).toBeGreaterThanOrEqual(44);
  const dockH = await dock.evaluate((e) => e.getBoundingClientRect().height);
  expect(dockH).toBeGreaterThanOrEqual(48);
  // theme and reading mode are not in the topbar on small screens (Theme lives in the drawer)
  await expect(page.locator('.topbar-tools')).toBeHidden();
  // code blocks scroll inside themselves
  const pre = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('.prose pre')).map((p) => ({
      overflowX: getComputedStyle(p).overflowX,
      inside: p.getBoundingClientRect().right <= window.innerWidth,
      scrolls: p.scrollWidth > p.clientWidth,
      tab: p.getAttribute('tabindex'),
    })),
  );
  expect(pre.length).toBeGreaterThan(0);
  for (const p of pre) {
    expect(p.overflowX).toBe('auto');
    expect(p.inside).toBe(true);
    if (p.scrolls) expect(p.tab).toBe('0');
  }
  await noHScroll(page);
});

test('drawer opens, shows theme, scrolls to the current doc, closes with Esc and returns focus', async ({ page }) => {
  await page.goto(PILOT_URL('en'));
  const menu = page.locator('.dock').getByRole('button', { name: 'Menu' });
  await menu.click();
  const dlg = page.locator('dialog.sheet-drawer[open]');
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole('button', { name: /Theme/ })).toBeVisible();
  const cur = dlg.locator('[aria-current="page"]');
  await expect(cur).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(menu).toBeFocused();
});

test('contents sheet opens, is capped at 70dvh, closes on link tap', async ({ page }) => {
  await page.goto(CODE);
  const btn = page.locator('.dock').getByRole('button', { name: 'Contents' });
  await btn.click();
  const dlg = page.locator('dialog.sheet-sheet[open]');
  await expect(dlg).toBeVisible();
  const h = await dlg.evaluate((e) => e.getBoundingClientRect().height);
  expect(h).toBeLessThanOrEqual(844 * 0.7 + 1);
  const link = dlg.locator('.toc a').first();
  const id = decodeURIComponent((await link.getAttribute('href'))!.slice(1));
  await link.click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  // the target heading sits below the topbar and holds focus (not the opener)
  await expect
    .poll(() =>
      page.evaluate((h) => {
        const el = document.getElementById(h)!;
        const bar = document.querySelector('.topbar-slot')!.getBoundingClientRect().bottom;
        return { below: el.getBoundingClientRect().top >= bar - 1, focused: document.activeElement === el };
      }, id),
    )
    .toEqual({ below: true, focused: true });
});

test('contents sheet closes with Esc and returns focus', async ({ page }) => {
  await page.goto(CODE);
  const btn = page.locator('.dock').getByRole('button', { name: 'Contents' });
  await btn.click();
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(btn).toBeFocused();
});

test('language popover lists three locales and keeps the heading position', async ({ page }) => {
  await page.goto(PILOT_URL('en'));
  await page.locator('[data-hi="3"]').first().evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.evaluate(() => window.scrollBy(0, 5));
  await page.locator('.dock').getByRole('button', { name: 'Language' }).click();
  const dlg = page.locator('dialog.sheet-popover[open]');
  await expect(dlg.locator('li')).toHaveCount(3);
  await expect(dlg.locator('.lang-marker, .lang-status')).toHaveCount(0);
  await dlg.getByRole('link', { name: /Tiếng Việt/ }).click();
  await expect(page).toHaveURL(/\/vi\/.*#h3(-|$)/);
});

test('home: a Theme control is reachable through the language dialog', async ({ page }) => {
  await page.goto('/en');
  await page.getByRole('button', { name: /EN, Language/ }).click();
  const dlg = page.locator('dialog.sheet-popover[open]');
  const theme = dlg.getByRole('button', { name: /Theme/ });
  await expect(theme).toBeVisible();
  const before = await theme.textContent();
  await theme.click();
  await expect(theme).not.toHaveText(before!);
});

test('home shows Start (or Resume) and five section rows with doc counts', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('[data-primary]')).toHaveCount(1);
  await expect(page.locator('[data-primary="start"]')).toHaveAttribute('href', /\/en\/advanced-java\//);
  await expect(page.locator('a.index-row')).toHaveCount(5);
  await expect(page.locator('a.index-row').first().locator('.index-count')).toHaveText(/^\d+ docs?$/);
  await expect(page.locator('a.index-row .index-lang')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  const rowH = await page.locator('a.index-row').first().evaluate((e) => e.getBoundingClientRect().height);
  expect(rowH).toBeGreaterThanOrEqual(44);
});

test('home shows Resume after a flag was stored', async ({ page }) => {
  await page.goto('/en');
  await page.evaluate(() =>
    localStorage.setItem(
      'flag:advanced-java:HC-01',
      JSON.stringify({ headingIndex: 2, headingText: 'x', headingCount: 5, zhHash: 'h', savedAt: Date.now() }),
    ),
  );
  await page.reload();
  await expect(page.locator('[data-primary="resume"]')).toBeVisible();
});

for (const l of ['vi', 'zh'] as const) {
  test(`${l}: dock labels are not clipped and nothing overflows`, async ({ page }) => {
    await page.goto(PILOT_URL(l));
    const clipped = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('.dock .dock-item'))
        .filter((e) => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)
        .map((e) => e.textContent),
    );
    expect(clipped).toEqual([]);
    const lh = await page.locator('.dock-item').first().evaluate((e) => {
      const cs = getComputedStyle(e);
      return parseFloat(cs.lineHeight) / parseFloat(cs.fontSize);
    });
    expect(lh).toBeGreaterThanOrEqual(1.2);
    await noHScroll(page);
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`/${l}`);
    const h = await page.locator('.topbar').evaluate((e) => e.getBoundingClientRect().height);
    expect(h, `${l} topbar height at 320px`).toBeLessThanOrEqual(60);
    await noHScroll(page);
  });
}

test('on a 1280px viewport the dock is hidden and the rails are sticky', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(PILOT_URL('en'));
  await expect(page.locator('.dock')).toBeHidden();
  expect(await page.locator('.shell > .rail').evaluate((e) => getComputedStyle(e).position)).toBe('sticky');
  expect(await page.locator('.shell > .toc-rail').evaluate((e) => getComputedStyle(e).position)).toBe('sticky');
  await expect(page.locator('.topbar-tools')).toBeVisible();
  await expect(page.locator('.shell > .rail details[open]')).toHaveCount(1);
});

test('desktop: scrolling marks the TOC and the margin step for the current heading', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(PILOT_URL('en'));
  await page.locator('.prose h2[id]').nth(1).evaluate((el) => el.scrollIntoView({ block: 'start' }));
  const id = await page.locator('.prose h2[id]').nth(1).getAttribute('id');
  await expect(page.locator(`.shell > .toc-rail .toc a[aria-current="location"]`)).toHaveAttribute('href', `#${id}`);
  await expect(page.locator(`.shell > .toc-rail .margin-steps a[aria-current="location"]`)).toHaveAttribute('href', `#${id}`);
  // clicking a step lands the heading below the topbar
  await page.locator('.shell > .toc-rail .margin-steps a').first().click();
  const first = await page.locator('.shell > .toc-rail .margin-steps a').first().getAttribute('href');
  await expect
    .poll(() =>
      page.evaluate((h) => {
        const top = document.getElementById(h.slice(1))!.getBoundingClientRect().top;
        return top >= document.querySelector('.topbar-slot')!.getBoundingClientRect().bottom - 1;
      }, first!),
    )
    .toBe(true);
});

for (const width of [320, 375, 390, 768, 1280, 1920]) {
  test(`no horizontal overflow at ${width}px (home, collection, section, doc, about)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const url of ['/en', C, `${C}/${sectionOf('database-shard')}`, SHARD, '/en/about']) {
      await page.goto(url);
      await noHScroll(page);
    }
  });
}

test('1920px: grid is full-bleed, content is capped at 90rem and centred', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto(SHARD);
  const m = await page.evaluate(() => {
    const shell = document.querySelector('.shell')!.getBoundingClientRect();
    const bar = document.querySelector('.topbar-slot')!.getBoundingClientRect();
    const rail = document.querySelector('.shell > .rail')!.getBoundingClientRect();
    const toc = document.querySelector('.shell > .toc-rail')!.getBoundingClientRect();
    return { shell: shell.width, bar: bar.width, left: rail.left, right: toc.right, iw: window.innerWidth };
  });
  expect(m.shell).toBe(m.iw);
  expect(m.bar).toBe(m.iw);
  expect(m.right - m.left).toBeLessThanOrEqual(1440 + 1);
  expect(Math.abs(m.left - (m.iw - m.right))).toBeLessThanOrEqual(1);
});

test('320px: search results span the top bar and do not overflow the page', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/en');
  await page.getByRole('searchbox').fill('redis');
  const list = page.locator('.search-results');
  await expect(list).toBeVisible();
  const m = await list.evaluate((e) => {
    const r = e.getBoundingClientRect();
    const bar = document.querySelector('.topbar')!.getBoundingClientRect();
    return { l: r.left, r: r.right, bl: bar.left, br: bar.right, iw: window.innerWidth };
  });
  expect(m.l).toBeGreaterThanOrEqual(0);
  expect(m.r).toBeLessThanOrEqual(m.iw);
  expect(Math.abs(m.l - m.bl)).toBeLessThanOrEqual(1);
  expect(Math.abs(m.r - m.br)).toBeLessThanOrEqual(1);
  await noHScroll(page);
});
