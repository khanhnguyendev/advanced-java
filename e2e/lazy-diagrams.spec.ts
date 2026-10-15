import { expect, test } from '@playwright/test';

const DOC = '/en/advanced-java/micro-services/how-eureka-enable-service-discovery-and-service-registration';
const SLOT = '.diagram-scroll[data-diagram-src]';

for (const width of [1280, 360]) {
test(`diagrams below the fold stay placeholders, fill on scroll, and do not shift layout at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 800 });
  // isolate the viewport-driven path: the background prefill (tested separately) must not run here
  await page.addInitScript(() => {
    window.requestIdleCallback = () => 0;
  });
  await page.goto(DOC);
  await page.waitForLoadState('networkidle');
  const total = await page.locator(SLOT).count();
  expect(total).toBeGreaterThan(10);
  const initialSvgs = await page.locator(`${SLOT} svg`).count();
  expect(initialSvgs, 'far diagrams must not be inlined up front').toBeLessThan(total);
  const heights = await page.locator(SLOT).evaluateAll((els) => els.map((e) => (e as HTMLElement).offsetHeight));
  const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);

  // scroll through the document in viewport steps
  for (let y = 0; y < docHeight; y += 600) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(40);
  }
  await expect(page.locator(`${SLOT}[data-state="loaded"]`)).toHaveCount(total, { timeout: 15_000 });
  await expect(page.locator(`${SLOT} svg`)).toHaveCount(total);
  await expect(page.locator(`${SLOT}[aria-busy]`)).toHaveCount(0);

  const after = await page.locator(SLOT).evaluateAll((els) => els.map((e) => (e as HTMLElement).offsetHeight));
  after.forEach((h, i) => expect(Math.abs(h - heights[i]), `slot ${i}: ${heights[i]} -> ${h}`).toBeLessThanOrEqual(2));
  const docAfter = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(Math.abs(docAfter - docHeight)).toBeLessThanOrEqual(total * 2);
  // inlined svg keeps its accessible name
  await expect(page.locator(`${SLOT} svg[role="img"]`).first()).toHaveAttribute('aria-labelledby', /-title .*-desc/);
});
}

test('without scrolling, the background prefill loads every diagram', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(DOC);
  const total = await page.locator(SLOT).count();
  expect(total).toBeGreaterThan(10);
  await expect(page.locator(`${SLOT}[data-state="loaded"]`)).toHaveCount(total, { timeout: 10_000 });
});

test('a heading jump near the end loads the diagrams that follow it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const last = await (async () => {
    await page.goto(DOC);
    return page.evaluate(() => {
      const hs = Array.from(document.querySelectorAll('[data-hi]'));
      return hs[hs.length - 1]?.getAttribute('data-hi') ?? '1';
    });
  })();
  await page.goto(`${DOC}#h${last}`);
  await expect(page.locator(SLOT).last()).toHaveAttribute('data-state', 'loaded', { timeout: 10_000 });
});

test('with JavaScript disabled the diagrams render from the noscript image', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(DOC);
  const img = page.locator('figure.diagram img').first();
  await expect(img).toBeAttached();
  const alt = await img.getAttribute('alt');
  expect(alt && alt.length).toBeGreaterThan(0);
  await img.scrollIntoViewIfNeeded();
  await expect(img).toBeVisible();
  await expect.poll(() => img.evaluate((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(await page.locator('figure.diagram svg').count()).toBe(0);
  await ctx.close();
});

test('the diagram file is immutable-cacheable', async ({ page }) => {
  await page.goto(DOC);
  const src = await page.locator(SLOT).first().getAttribute('data-diagram-src');
  const res = await page.request.get(src!);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('image/svg+xml');
  expect(res.headers()['cache-control']).toContain('immutable');
});
