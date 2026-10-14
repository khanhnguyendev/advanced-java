import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { contentRoot } from '../lib/content/collection';
import { listDiagrams } from '../lib/diagrams/load';
import { renderDiagram } from '../lib/diagrams/render';
import { DIAGRAM_LOCALES } from '../lib/diagrams/types';
import type { DiagramLocale } from '../lib/diagrams/types';

const THEMES = {
  light: { paper: '#f4f8fc', ink: '#10151f', muted: '#46526a', grid: '#cfdbea', accent: '#1f4fd8', rule: '#b9c7da' },
  dark: { paper: '#0a2540', ink: '#e8f1ff', muted: '#a9bfdc', grid: '#1d4066', accent: '#7fb0ff', rule: '#3f6fa6' },
} as const;

async function main(): Promise<void> {
  const [id, locArg, themeArg = 'light'] = process.argv.slice(2);
  if (!id || !locArg || !(DIAGRAM_LOCALES as readonly string[]).includes(locArg) || !(themeArg in THEMES)) {
    console.error('usage: pnpm diagrams:png <id> <zh|en|vi> [light|dark]');
    process.exit(2);
  }
  const locale = locArg as DiagramLocale;
  const theme = THEMES[themeArg as keyof typeof THEMES];
  const d = listDiagrams(contentRoot()).find((x) => x.id === id);
  if (!d) {
    console.error(`diagram not found: ${id}`);
    process.exit(2);
  }
  const labels = d.labels[locale];
  if (!labels) {
    console.error(`no ${locale} labels for ${id}`);
    process.exit(2);
  }
  const svg = renderDiagram(d.scene, labels.labels, locale);
  const html =
    `<!doctype html><meta charset="utf-8"><style>:root{--paper:${theme.paper};--ink:${theme.ink};` +
    `--ink-muted:${theme.muted};--grid:${theme.grid};--accent:${theme.accent};--rule:${theme.rule}}` +
    `html,body{margin:0;background:var(--paper)}#w{width:${d.scene.size.w}px;padding:16px;box-sizing:content-box}` +
    `</style><div id="w">${svg}</div>`;
  const name = path.basename(d.file, '.diagram.json');
  const outDir = path.join(process.cwd(), '.diagrams-out');
  mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${name}.${locale}.${themeArg}.png`);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: d.scene.size.w + 32, height: d.scene.size.h + 32 }, deviceScaleFactor: 2 });
    await page.setContent(html);
    writeFileSync(out, await page.locator('#w').screenshot());
  } finally {
    await browser.close();
  }
  console.log(out);
}

void main();
