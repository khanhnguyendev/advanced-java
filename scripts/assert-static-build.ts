import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { contentRoot, listCollections, listDocs, loadCollection } from '../lib/content/collection';
import { LOCALES } from '../lib/content/types';

export interface StaticCheckInput {
  prerenderedRoutes: Record<string, { initialRevalidateSeconds?: number | false }>;
  prerenderedPatterns: Record<string, { fallback?: boolean | string | null }>;
  appPatterns: string[];
  expectedDocRoutes: string[];
  allowDynamic: string[];
}

export function checkStaticBuild(i: StaticCheckInput): string[] {
  const problems: string[] = [];

  for (const r of i.expectedDocRoutes) {
    if (!(r in i.prerenderedRoutes)) problems.push(`doc route not prerendered: ${r}`);
  }
  for (const [route, info] of Object.entries(i.prerenderedRoutes)) {
    if (info.initialRevalidateSeconds !== false && info.initialRevalidateSeconds !== undefined) {
      problems.push(`route ${route} has a revalidate value (${String(info.initialRevalidateSeconds)}); expected false`);
    }
  }
  for (const p of i.appPatterns) {
    if (!p.startsWith('/[locale]')) continue;
    if (!p.includes('[')) continue;
    if (i.allowDynamic.includes(p)) continue;
    if (!(p in i.prerenderedPatterns)) problems.push(`dynamic route is not statically generated: ${p}`);
  }
  for (const [p, info] of Object.entries(i.prerenderedPatterns)) {
    if (!p.startsWith('/[locale]')) continue;
    if (info.fallback !== false) {
      problems.push(`pattern ${p} allows on-demand params (fallback=${String(info.fallback)}); dynamicParams must be false`);
    }
  }
  return problems;
}

function readJson<T>(file: string): T {
  if (!existsSync(file)) throw new Error(`missing build output: ${file}`);
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

if (path.basename(process.argv[1] ?? '') === 'assert-static-build.ts') {
  // U11: the manifest shapes below are verified against Next 16.4.0 in Task 13 Step 7 (app-path-routes-manifest.json lives in .next/, not .next/server/).
  const prerender = readJson<{
    routes: Record<string, { initialRevalidateSeconds?: number | false }>;
    dynamicRoutes: Record<string, { fallback?: boolean | string | null }>;
  }>('.next/prerender-manifest.json');
  const appPathRoutes = readJson<Record<string, string>>('.next/app-path-routes-manifest.json');

  const root = contentRoot();
  const expected: string[] = [];
  for (const id of listCollections(root)) {
    for (const d of listDocs(loadCollection(root, id))) {
      for (const l of LOCALES) expected.push(`/${l}/${id}/${d.section}/${d.slug}`);
    }
  }
  const problems = checkStaticBuild({
    prerenderedRoutes: prerender.routes,
    prerenderedPatterns: prerender.dynamicRoutes,
    appPatterns: Array.from(new Set(Object.values(appPathRoutes))),
    expectedDocRoutes: expected,
    allowDynamic: ['/[locale]/[...rest]'],
  });
  if (problems.length) {
    console.error('static build assertion FAILED:\n- ' + problems.join('\n- '));
    process.exit(1);
  }
  console.log(`static build assertion OK (${expected.length} doc routes prerendered)`);
}
