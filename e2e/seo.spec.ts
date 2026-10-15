import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PILOT, sectionOf } from './helpers';

const PILOT_DOC = `/en/advanced-java/${sectionOf(PILOT)}/${PILOT}`;
const ZH_SERVED = '/en/advanced-java/micro-services/microservices-introduction';

interface Case { name: string; path: string; ldTypes: string[]; ogType: 'website' | 'article'; ogLocale: string }

const cases: Case[] = [
  { name: 'home en', path: '/en', ldTypes: ['WebSite'], ogType: 'website', ogLocale: 'en_US' },
  { name: 'home vi', path: '/vi', ldTypes: ['WebSite'], ogType: 'website', ogLocale: 'vi_VN' },
  { name: 'home zh', path: '/zh', ldTypes: ['WebSite'], ogType: 'website', ogLocale: 'zh_CN' },
  { name: 'about en', path: '/en/about', ldTypes: [], ogType: 'website', ogLocale: 'en_US' },
  { name: 'collection', path: '/en/advanced-java', ldTypes: ['BreadcrumbList'], ogType: 'website', ogLocale: 'en_US' },
  { name: 'section', path: `/en/advanced-java/${sectionOf(PILOT)}`, ldTypes: ['BreadcrumbList'], ogType: 'website', ogLocale: 'en_US' },
  { name: 'doc', path: PILOT_DOC, ldTypes: ['TechArticle', 'BreadcrumbList'], ogType: 'article', ogLocale: 'en_US' },
  { name: 'zh-served doc under /en', path: ZH_SERVED, ldTypes: ['TechArticle', 'BreadcrumbList'], ogType: 'article', ogLocale: 'zh_CN' },
];

const meta = (page: Page, sel: string) => page.locator(`head meta[${sel}]`);

for (const c of cases) {
  test(`seo head: ${c.name}`, async ({ page, request }) => {
    await page.goto(c.path);
    await expect(page.locator('head title')).toHaveCount(1);
    expect((await page.title()).length).toBeGreaterThan(0);

    const desc = meta(page, 'name="description"');
    await expect(desc).toHaveCount(1);
    const d = (await desc.getAttribute('content')) ?? '';
    expect(d.trim().length).toBeGreaterThan(0);
    expect([...d].length).toBeLessThanOrEqual(160);

    const canonical = page.locator('head link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    const canonicalUrl = (await canonical.getAttribute('href'))!;
    expect(canonicalUrl).toMatch(/^https?:\/\//);

    const hreflangs = await page.locator('head link[rel="alternate"][hreflang]').evaluateAll((els) =>
      els.map((e) => e.getAttribute('hreflang')),
    );
    expect(hreflangs).toContain('x-default');
    expect(hreflangs.length).toBeGreaterThanOrEqual(2);

    const og = async (p: string) => meta(page, `property="${p}"`).first().getAttribute('content');
    expect(await og('og:title')).toBe(await page.title());
    expect(await og('og:description')).toBe(d);
    expect(await og('og:url')).toBe(canonicalUrl);
    expect(await og('og:type')).toBe(c.ogType);
    expect(await og('og:locale')).toBe(c.ogLocale);
    expect(await og('og:site_name')).toBe('advanced-java');
    const image = (await og('og:image'))!;
    expect(image).toMatch(/\/opengraph-image/);
    await expect(meta(page, 'name="twitter:card"')).toHaveAttribute('content', 'summary_large_image');
    await expect(meta(page, 'name="twitter:title"')).toHaveAttribute('content', await page.title());

    const ld = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((els) => els.map((e) => JSON.parse(e.textContent ?? '')));
    expect(ld.map((x) => x['@type'])).toEqual(c.ldTypes);

    const res = await request.get(new URL(image).pathname + new URL(image).search);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
    expect((await res.body()).length).toBeGreaterThan(0);
  });
}

const ldOf = (page: Page) =>
  page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.map((e) => JSON.parse(e.textContent ?? '')));
const enMessages = JSON.parse(readFileSync(path.join(__dirname, '../messages/en.json'), 'utf8')).attribution as Record<string, string>;

test('zh-served doc canonicals to /zh, says zh-Hans and drops the duplicate collection crumb', async ({ page }) => {
  await page.goto(ZH_SERVED);
  const canonical = await page.locator('head link[rel="canonical"]').getAttribute('href');
  const zhPath = '/zh/advanced-java/micro-services/microservices-introduction';
  expect(new URL(canonical!).pathname).toBe(zhPath);
  const ld = await ldOf(page);
  const article = ld.find((x) => x['@type'] === 'TechArticle');
  expect(article.inLanguage).toBe('zh-Hans');
  const crumbs = ld.find((x) => x['@type'] === 'BreadcrumbList');
  const names = crumbs.itemListElement.map((i: { name: string }) => i.name);
  expect(new Set(names).size).toBe(names.length);
  expect(new URL(crumbs.itemListElement.at(-1).item).pathname).toBe(zhPath);
});

test('translation-credited doc (Fowler): no site license, visible credit text, translationOfWork', async ({ page }) => {
  await page.goto(ZH_SERVED);
  const article = (await ldOf(page)).find((x) => x['@type'] === 'TechArticle');
  expect(article.license).toBeUndefined();
  expect(article.creditText).toContain(enMessages.licenseCredited.replace(/\s+/g, ' '));
  const visible = (await page.locator('footer.attribution').innerText()).replace(/\s+/g, ' ');
  expect(visible).toContain(article.creditText.split(' ').slice(-6).join(' '));
  expect(article.translationOfWork).toMatchObject({ '@type': 'CreativeWork', name: 'Microservices', url: expect.stringContaining('martinfowler.com') });
});

test('adaptation-credited doc: isBasedOn with the original license, no site license', async ({ page }) => {
  await page.goto('/en/advanced-java/high-availability/sentinel-vs-hystrix');
  const article = (await ldOf(page)).find((x) => x['@type'] === 'TechArticle');
  expect(article.license).toBeUndefined();
  expect(article.isBasedOn).toMatchObject({ '@type': 'CreativeWork', license: expect.stringContaining('apache.org') });
  expect(article.translationOfWork).toBeUndefined();
});

test('derived-credited doc (eureka): citation, no isBasedOn, no site license', async ({ page }) => {
  await page.goto('/en/advanced-java/micro-services/how-eureka-enable-service-discovery-and-service-registration');
  const article = (await ldOf(page)).find((x) => x['@type'] === 'TechArticle');
  expect(article.license).toBeUndefined();
  expect(article.citation).toMatchObject({ '@type': 'CreativeWork' });
  expect(article.isBasedOn).toBeUndefined();
  expect(article.creditText).toContain(enMessages.licenseDerived);
});

test('an original Doocs doc keeps the CC-BY-SA license and the Doocs credit', async ({ page }) => {
  await page.goto(PILOT_DOC);
  const article = (await ldOf(page)).find((x) => x['@type'] === 'TechArticle');
  expect(article.license).toBe('https://creativecommons.org/licenses/by-sa/4.0/');
  expect(article.creditText).toBe('Original by Doocs and 中华石杉');
});

test('translated doc: JSON-LD inLanguage en and dateModified from frontmatter', async ({ page }) => {
  await page.goto(PILOT_DOC);
  const ld = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((els) => els.map((e) => JSON.parse(e.textContent ?? '')));
  const article = ld.find((x) => x['@type'] === 'TechArticle');
  expect(article.inLanguage).toBe('en');
  expect(article.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}/);
  expect(article.datePublished).toBeUndefined();
});

for (const [url, type] of [
  ['/favicon.ico', 'image/x-icon'],
  ['/apple-icon.png', 'image/png'],
  ['/icon.png', 'image/png'],
  ['/icon-512.png', 'image/png'],
  ['/icon.svg', 'image/svg+xml'],
  ['/manifest.webmanifest', 'application/manifest+json'],
] as const) {
  test(`asset ${url}`, async ({ request }) => {
    const res = await request.get(url);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain(type);
    expect((await res.body()).length).toBeGreaterThan(0);
  });
}

test('robots.txt hides the review pages and sitemap carries lastmod for translated docs', async ({ request }) => {
  expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /*/review/');
  const sm = await (await request.get('/sitemap.xml')).text();
  expect(sm).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}/);
});

test('404 is noindex', async ({ request }) => {
  const res = await request.get('/en/definitely-not-a-page');
  expect(res.status()).toBe(404);
  // Next adds exactly one robots meta to not-found responses
  const robots = [...(await res.text()).matchAll(/<meta name="robots" content="([^"]*)"/g)].map((m) => m[1]);
  expect(robots).toEqual(['noindex']);
});
