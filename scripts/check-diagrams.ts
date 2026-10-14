import path from 'node:path';
import { contentRoot } from '../lib/content/collection';
import { gateAll, GLOSSARY_ID } from '../lib/diagrams/run';
import type { GateResult } from '../lib/diagrams/run';

/** `opts.id` limits the run to one diagram; glossary conflicts are always reported. */
export function runGate(root: string, opts: { id?: string } = {}): GateResult[] {
  return gateAll(root, opts);
}

export function parseArgs(argv: string[]): { id?: string; bad?: string } {
  let id: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--') continue;
    if (a === '--id') {
      id = argv[++i];
      if (!id) return { bad: '--id needs a value' };
    } else if (a.startsWith('--id=')) {
      id = a.slice(5);
      if (!id) return { bad: '--id needs a value' };
    } else return { bad: `unknown argument ${a}` };
  }
  return id === undefined ? {} : { id };
}

if (path.basename(process.argv[1] ?? '') === 'check-diagrams.ts') {
  const args = parseArgs(process.argv.slice(2));
  if (args.bad) {
    console.error(`usage: pnpm check:diagrams [-- --id <diagram id>] (${args.bad})`);
    process.exit(2);
  }
  const results = runGate(contentRoot(), args.id === undefined ? {} : { id: args.id });
  let n = 0;
  for (const r of results) {
    for (const e of r.errors) {
      n += 1;
      console.log(`${r.id}: ${e.code}${e.locale ? ` [${e.locale}]` : ''}: ${e.message}`);
    }
  }
  const diagrams = results.filter((r) => r.id !== GLOSSARY_ID).length;
  console.log(`check:diagrams: ${diagrams} diagrams, ${n} errors`);
  process.exit(n > 0 ? 1 : 0);
}
