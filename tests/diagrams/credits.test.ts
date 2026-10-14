import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CollectionConfig } from '../../lib/content/types';
import { listDiagramCredits } from '../../lib/diagrams/credits';

describe('listDiagramCredits', () => {
  it('returns sorted credits with upstream blob hrefs', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'dc-'));
    const dir = path.join(root, 'c/_diagrams/hc/s');
    mkdirSync(dir, { recursive: true });
    for (const n of ['b', 'a']) {
      writeFileSync(
        path.join(dir, `${n}.diagram.json`),
        JSON.stringify({ id: `hc/s/${n}`, source: { upstream: `hc/s/${n}.png`, commit: 'abc' }, license: 'derived' }),
      );
    }
    writeFileSync(path.join(dir, 'a.glossary.json'), '{}');
    const c = { id: 'c', upstream: { repo: 'https://r', commit: 'abc' } } as unknown as CollectionConfig;
    const out = listDiagramCredits(root, c);
    expect(out.map((o) => o.id)).toEqual(['hc/s/a', 'hc/s/b']);
    expect(out[0]).toMatchObject({ upstream: 'hc/s/a.png', href: 'https://r/blob/abc/docs/hc/images/a.png', license: 'derived' });
  });
});
