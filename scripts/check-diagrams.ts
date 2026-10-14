import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { contentRoot } from '../lib/content/collection';
import { checkDiagram } from '../lib/diagrams/gate';
import { listDiagrams } from '../lib/diagrams/load';
import type { GateError } from '../lib/diagrams/types';

export function runGate(root: string): { id: string; errors: GateError[] }[] {
  return listDiagrams(root).map((d) => {
    const { errors } = checkDiagram(d.scene, d.labels, {
      assetExists: (up) => {
        const p = path.join(d.assetsDir, up);
        return existsSync(p) && statSync(p).isFile();
      },
    });
    return { id: d.id, errors: [...d.loadErrors, ...errors] };
  });
}

if (path.basename(process.argv[1] ?? '') === 'check-diagrams.ts') {
  const results = runGate(contentRoot());
  let n = 0;
  for (const r of results) {
    for (const e of r.errors) {
      n += 1;
      console.log(`${r.id}: ${e.code}${e.locale ? ` [${e.locale}]` : ''}: ${e.message}`);
    }
  }
  console.log(`check:diagrams: ${results.length} diagrams, ${n} errors`);
  process.exit(n > 0 ? 1 : 0);
}
