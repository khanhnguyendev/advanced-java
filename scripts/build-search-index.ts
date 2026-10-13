import { execFileSync } from 'node:child_process';
import { readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { contentRoot, listCollections } from '../lib/content/collection';
import { LOCALES, type Locale } from '../lib/content/types';
import { buildCorpus, writeSearchSite, type CorpusDoc } from './search-gate/corpus';

export const SITE_DIR = '.search-index/site';
export const OUT_DIR = path.join('public', 'pagefind');

function countFiles(dir: string): number {
  return readdirSync(dir).reduce((n, f) => {
    const p = path.join(dir, f);
    return n + (statSync(p).isDirectory() ? countFiles(p) : 1);
  }, 0);
}

export function buildSearchIndex(root = contentRoot()): { pages: number; files: number } {
  rmSync('.search-index', { recursive: true, force: true });
  rmSync(OUT_DIR, { recursive: true, force: true });
  let pages = 0;
  // Pagefind has one index across the site; each page carries its collection as a filter.
  for (const collection of listCollections(root)) {
    const corpus = Object.fromEntries(LOCALES.map((l) => [l, buildCorpus(root, collection, l)])) as Record<Locale, CorpusDoc[]>;
    pages += writeSearchSite(corpus, SITE_DIR, collection);
  }
  if (pages === 0) return { pages, files: 0 };
  execFileSync('pnpm', ['exec', 'pagefind', '--site', SITE_DIR, '--output-path', OUT_DIR], { stdio: 'inherit' });
  return { pages, files: countFiles(OUT_DIR) };
}

if (path.basename(process.argv[1] ?? '') === 'build-search-index.ts') {
  const t0 = Date.now();
  const r = buildSearchIndex();
  console.log(`search index: ${r.pages} page(s), ${r.files} file(s) in public/pagefind (${Date.now() - t0} ms)`);
}
