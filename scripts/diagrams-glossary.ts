import path from 'node:path';
import { contentRoot } from '../lib/content/collection';
import { mergeGlossaries } from '../lib/diagrams/glossary';

if (path.basename(process.argv[1] ?? '') === 'diagrams-glossary.ts') {
  const r = mergeGlossaries(contentRoot());
  for (const e of [...r.conflicts, ...r.errors]) console.log(`${e.code}: ${e.message}`);
  if (r.conflicts.length || r.errors.length) {
    console.log('diagrams:glossary: nothing written (fix the problems above)');
    process.exit(1);
  }
  for (const f of r.written) console.log(`wrote ${path.relative(process.cwd(), f)}`);
  for (const f of r.deleted) console.log(`deleted ${path.relative(process.cwd(), f)}`);
  console.log(`diagrams:glossary: ${r.written.length} glossaries updated, ${r.deleted.length} sidecars merged`);
}
