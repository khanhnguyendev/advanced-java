import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectDiagramSvgs } from '@/lib/diagrams/emit';
import { fsDiagramSource } from '@/lib/diagrams/source';
import { extractHeadings } from '@/lib/render/headings';
import { renderMarkdown } from '@/lib/render/pipeline';

const FIXTURE = path.resolve(__dirname, '../fixtures/diagrams/content');
const ID = 'demo/toy/toy';
const LOCALES = ['en', 'vi', 'zh'] as const;

/** Temp content root: the toy diagram fixture plus one doc per locale (title H1, two diagrams, a later H1). */
function makeRoot() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'emit-'));
  cpSync(path.join(FIXTURE, 'toy'), path.join(root, 'toy'), { recursive: true });
  writeFileSync(
    path.join(root, 'toy/collection.json'),
    JSON.stringify({
      id: 'toy',
      sourceLocale: 'en',
      tabColor: '#000',
      fallback: { en: [], vi: ['en'], zh: ['en'] },
      sections: [{ id: 'demo', prefix: '', groups: [{ id: 'g', docs: ['doc'] }] }],
      ids: { doc: 'toy-1' },
      upstream: { repo: '', commit: '' },
      upstreamFiles: {},
    }),
  );
  for (const loc of LOCALES) {
    mkdirSync(path.join(root, 'toy', loc, 'demo'), { recursive: true });
    writeFileSync(
      path.join(root, 'toy', loc, 'demo', 'doc.md'),
      `# Title\n\n## A\n\n![a](diagram:${ID})\n\ntext\n\n## B\n\n![b](diagram:${ID})\n`,
    );
  }
  return root;
}

describe('collectDiagramSvgs matches the page pipeline', () => {
  it('every data-diagram-src rendered for each doc/locale is an emitted file', async () => {
    const root = makeRoot();
    const emitted = collectDiagramSvgs(root);
    expect(emitted.size).toBeGreaterThan(0);
    const diagrams = fsDiagramSource(root, 'toy');
    for (const loc of LOCALES) {
      const md = (await import('node:fs')).readFileSync(path.join(root, 'toy', loc, 'demo', 'doc.md'), 'utf8');
      const { html } = await renderMarkdown(md, {
        collection: 'toy',
        routeLocale: loc,
        bodyLocale: loc,
        currentHeadings: extractHeadings(md),
        headingsOf: () => null,
        assetExists: () => true,
        sectionExists: () => true,
        diagrams,
      });
      const srcs = [...html.matchAll(/data-diagram-src="\/diagram-svg\/([^"]+)"/g)].map((m) => m[1]!);
      expect(srcs).toHaveLength(2);
      for (const f of srcs) expect(emitted.has(f), `${loc}: ${f}`).toBe(true);
    }
  });
});
