import path from 'node:path';
import { contentRoot } from '../lib/content/collection';
import { listDiagrams } from '../lib/diagrams/load';
import { gateLoaded } from '../lib/diagrams/run';
import type { GateError } from '../lib/diagrams/types';

export function runGate(root: string): { id: string; errors: GateError[] }[] {
  return listDiagrams(root).map((d) => ({ id: d.id, errors: gateLoaded(d) }));
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
