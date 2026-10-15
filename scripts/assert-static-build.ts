import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { contentRoot, listCollections, listDocs, loadCollection } from '../lib/content/collection';
import { LOCALES } from '../lib/content/types';
import { replacedRasters } from '../lib/diagrams/credits';

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

export interface ManifestRoute { initialRevalidateSeconds?: number | false; initialStatus?: number }

/** Strict extra checks used by the CLI: non-empty expectation, explicit revalidate=false, status 200. */
export function strictManifestProblems(expected: string[], routes: Record<string, ManifestRoute>): string[] {
  const problems: string[] = [];
  if (expected.length === 0) problems.push('no doc routes expected: content root empty?');
  for (const [route, info] of Object.entries(routes)) {
    if (info.initialRevalidateSeconds === undefined) {
      problems.push(`route ${route} has no initialRevalidateSeconds in the prerender manifest`);
    }
  }
  for (const r of expected) {
    const info = routes[r];
    if (info && info.initialStatus !== undefined && info.initialStatus !== 200) {
      problems.push(`doc route ${r} prerendered with status ${String(info.initialStatus)}; expected 200`);
    }
  }
  return problems;
}

function walkHtml(dir: string, out: string[]) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walkHtml(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
}

/**
 * Built HTML under `htmlRoot` that embeds an `<img>` whose src points at a replaced raster
 * (`/_content/<collection>/<upstream>`). `replaced` maps collection id to `_assets` keys.
 */
export function replacedRasterProblems(htmlRoot: string, replaced: Record<string, Iterable<string>>): string[] {
  if (!existsSync(htmlRoot)) return [];
  const files: string[] = [];
  walkHtml(htmlRoot, files);
  const targets: string[] = [];
  for (const [collection, keys] of Object.entries(replaced)) {
    for (const k of keys) targets.push(`/_content/${collection}/${k}`);
  }
  const problems: string[] = [];
  for (const f of files) {
    const html = readFileSync(f, 'utf8');
    for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
      const tag = m[0];
      const hit = targets.find((t) => tag.includes(t) || tag.includes(encodeURI(t)));
      if (hit) problems.push(`${path.relative(htmlRoot, f)} embeds replaced raster ${hit}`);
    }
  }
  return problems;
}

/**
 * Lazy diagram slots: the `/diagram-svg/[file]` route must be fully static (fallback=false) and every
 * `data-diagram-src` in built HTML must be one of its prerendered files.
 */
export function diagramAssetProblems(
  htmlRoot: string,
  routes: Record<string, unknown>,
  patterns: Record<string, { fallback?: boolean | string | null }>,
): string[] {
  const problems: string[] = [];
  const p = patterns['/diagram-svg/[file]'];
  if (!p) problems.push('route /diagram-svg/[file] is not statically generated');
  else if (p.fallback !== false) problems.push(`pattern /diagram-svg/[file] allows on-demand params (fallback=${String(p.fallback)})`);
  if (!existsSync(htmlRoot)) return problems;
  const files: string[] = [];
  walkHtml(htmlRoot, files);
  const missing = new Set<string>();
  for (const f of files) {
    for (const m of readFileSync(f, 'utf8').matchAll(/data-diagram-src="([^"]+)"/g)) {
      if (!(m[1] in routes)) missing.add(m[1]);
    }
  }
  for (const src of missing) problems.push(`built html references ${src} but it is not prerendered`);
  return problems;
}

function readJson<T>(file: string): T {
  if (!existsSync(file)) throw new Error(`missing build output: ${file}`);
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

if (path.basename(process.argv[1] ?? '') === 'assert-static-build.ts') {
  // U11: the manifest shapes below are verified against Next 16.4.0 in Task 13 Step 7 (app-path-routes-manifest.json lives in .next/, not .next/server/).
  const prerender = readJson<{
    routes: Record<string, ManifestRoute>;
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
  const problems = strictManifestProblems(expected, prerender.routes);
  problems.push(...checkStaticBuild({
    prerenderedRoutes: prerender.routes,
    prerenderedPatterns: prerender.dynamicRoutes,
    appPatterns: Array.from(new Set(Object.values(appPathRoutes))),
    expectedDocRoutes: expected,
    allowDynamic: ['/[locale]/[...rest]'],
  }));
  problems.push(...diagramAssetProblems('.next/server/app', prerender.routes, prerender.dynamicRoutes));
  if (process.env.DIAGRAM_REVIEW !== '1') {
    const replaced: Record<string, Set<string>> = {};
    for (const id of listCollections(root)) replaced[id] = replacedRasters(root, id);
    problems.push(...replacedRasterProblems('.next/server/app', replaced));
  }
  if (problems.length) {
    console.error('static build assertion FAILED:\n- ' + problems.join('\n- '));
    process.exit(1);
  }
  console.log(`static build assertion OK (${expected.length} doc routes prerendered)`);
}
