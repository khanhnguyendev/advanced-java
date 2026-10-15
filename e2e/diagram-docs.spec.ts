import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const ROOT = path.resolve(__dirname, '../content/advanced-java/zh');

function findDocs(): { section: string; slug: string; md: string }[] {
  const out: { section: string; slug: string; md: string }[] = [];
  let sections: string[] = [];
  try {
    sections = readdirSync(ROOT).filter((n) => statSync(path.join(ROOT, n)).isDirectory());
  } catch {
    return out;
  }
  for (const section of sections) {
    for (const f of readdirSync(path.join(ROOT, section)).filter((n) => n.endsWith('.md'))) {
      const md = readFileSync(path.join(ROOT, section, f), 'utf8');
      if (md.includes('](diagram:')) out.push({ section, slug: f.slice(0, -3), md });
    }
  }
  return out;
}

const docs = findDocs();

test.describe('docs with redrawn diagrams', () => {
  test.skip(docs.length === 0, 'no doc references a diagram yet');

  test('renders inline svg, no page overflow at 360px, page-language labels', async ({ page }) => {
    const d = docs[0];
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`/en/advanced-java/${d.section}/${d.slug}`);
    // diagrams are lazy: bring the first one near the viewport so it is inlined
    await page.locator('figure.diagram').first().scrollIntoViewIfNeeded();
    const svg = page.locator('figure.diagram svg').first();
    await expect(svg).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const bodyLang = await page.locator('article.prose').getAttribute('lang');
    const text = (await svg.locator('text').allTextContents()).join('');
    const hasHan = /[一-鿿]/.test(text);
    expect(hasHan).toBe(bodyLang === 'zh-Hans');
    await expect(svg).toHaveAttribute('lang', bodyLang === 'zh-Hans' ? 'zh' : (bodyLang as string));
  });
});
