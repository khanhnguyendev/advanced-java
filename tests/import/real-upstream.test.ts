import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runImport } from '../../scripts/import-upstream';

describe.skipIf(!existsSync('ref/docs/.vitepress/config.mts'))('real upstream import', () => {
  it('imports 81 docs in 5 sections with unique catalog ids and no failures', () => {
    const out = mkdtempSync(path.join(os.tmpdir(), 'real-'));
    const commit = execSync('git -C ref rev-parse HEAD').toString().trim();
    const r = runImport({ upstreamRoot: 'ref', outRoot: out, collection: 'advanced-java', commit });
    expect(r.docCount).toBe(81);
    const c = JSON.parse(readFileSync(path.join(out, 'advanced-java/collection.json'), 'utf8'));
    expect(c.sections.map((s: { id: string }) => s.id)).toHaveLength(5);
    const ids = Object.values(c.ids) as string[];
    expect(new Set(ids).size).toBe(81);
    expect(ids.filter((i) => i.startsWith('HC-')).length).toBeGreaterThan(0);
    expect(c.upstreamFiles['whats-microservice-how-to-communicate']).toBe(
      "docs/micro-services/what's-microservice-how-to-communicate.md",
    );
    const report = readFileSync(path.join(out, 'advanced-java/import-report.md'), 'utf8');
    const placedAt = report.indexOf('## Unlisted docs placed via root README');
    expect(placedAt).toBeGreaterThan(-1);
    const placedSection = report.slice(placedAt, report.indexOf('\n## ', placedAt + 5));
    for (const f of ['topk-problems-and-solutions', 'redis-rehash', 'advantages-and-disadvantages-of-microservice']) {
      expect(placedSection).toContain(`${f}.md`);
    }
    for (const f of [
      'docs/index.md',
      'docs/big-data/README.md',
      'docs/distributed-system/README.md',
      'docs/high-availability/README.md',
      'docs/high-concurrency/README.md',
      'docs/micro-services/README.md',
      'docs/extra-page/README.md',
    ]) {
      expect(report).toContain(f);
    }
    expect(report).toContain('images copied: 126 (127 image references)');
    for (const promo of ['advanced.md', 'offer.md', 'rights-defending-action.md', 'subscriptions-for-doocs.md']) {
      expect(report).toContain(promo);
    }
  });
});
