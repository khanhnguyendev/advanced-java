import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { create, insertMultiple, search as oramaSearch, save } from '@orama/orama';
import { chromium } from '@playwright/test';
import { contentRoot } from '../../lib/content/collection';
import { foldDiacritics } from '../../lib/search/fold';
import type { Locale } from '../../lib/content/types';
import { buildCorpus, type CorpusDoc } from './corpus';
import queries from './queries.json';

const COLLECTION = 'advanced-java';
const LOCALES: Locale[] = ['zh', 'vi', 'en'];
const SITE = '.search-gate/site';

interface Q { q: string; anyOf: string[]; kind: string; locale: Locale }
interface Metric { engine: string; locale: Locale; queries: number; hit10: number; top1: number; failures: string[]; foreign?: number }

function buildQueries(corpus: Record<Locale, CorpusDoc[]>): Q[] {
  const out: Q[] = queries.zh.map((x) => ({ ...x, kind: 'hand', locale: 'zh' as Locale }));
  for (const locale of queries.derived.locales as Locale[]) {
    for (const slug of queries.derived.pilotSlugs) {
      const d = corpus[locale].find((x) => x.slug === slug);
      if (!d || d.fallback) continue; // only docs that are really translated
      out.push({ q: d.title, anyOf: [slug], kind: 'title', locale });
      out.push({ q: foldDiacritics(d.title), anyOf: [slug], kind: 'title-no-accents', locale });
      if ((queries.derived.wordForms.locales as string[]).includes(locale)) {
        const v = wordForms(d.title);
        if (v !== d.title) out.push({ q: v, anyOf: [slug], kind: queries.derived.wordForms.kind, locale });
      }
    }
  }
  return out;
}

// crude suffix-trimmed word variants: "queues" -> "queue", "caching" -> "cach" is avoided (only trims s/es/ed/ing on long words)
function wordForms(title: string): string {
  return title
    .split(/\s+/)
    .map((w) => (w.length > 5 ? w.replace(/(ing|ed|es|s)$/i, '') : w))
    .join(' ');
}

// Orama's default english splitter breaks accented Vietnamese tokens; split vi/en on non letter/digit instead.
function unicodeTokenizer() {
  return {
    language: 'english',
    normalizationCache: new Map<string, string>(),
    tokenize: (raw: string) =>
      String(raw)
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean),
  };
}

async function score(engine: string, locale: Locale, qs: Q[], run: (q: Q) => Promise<string[]> | string[]): Promise<Metric> {
  const mine = qs.filter((q) => q.locale === locale);
  let hit10 = 0;
  let top1 = 0;
  const failures: string[] = [];
  for (const q of mine) {
    const slugs = await run(q);
    if (q.anyOf.some((s) => slugs.slice(0, 10).includes(s))) hit10 += 1;
    else failures.push(`${q.kind}: ${q.q}`);
    if (q.anyOf.includes(slugs[0])) top1 += 1;
  }
  return { engine, locale, queries: mine.length, hit10, top1, failures };
}

async function oramaGate(corpus: Record<Locale, CorpusDoc[]>, qs: Q[]) {
  const metrics: Metric[] = [];
  const sizes: Record<string, number> = {};
  const latency: number[] = [];
  const buildMs: Record<string, number> = {};
  for (const locale of LOCALES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let components: any;
    const t0 = performance.now();
    if (locale === 'zh') {
      // ADAPTER: Mandarin tokenizer export from @orama/tokenizers/mandarin
      const mod = await import('@orama/tokenizers/mandarin');
      components = { tokenizer: await mod.createTokenizer() };
    } else {
      components = { tokenizer: unicodeTokenizer() };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = await create({
      schema: { slug: 'string', title: 'string', body: 'string' } as const,
      components,
    });
    await insertMultiple(
      db,
      corpus[locale].map((d) => ({
        slug: d.slug,
        title: d.title,
        // index accented and folded forms so a query in either form matches
        body: d.lang === 'vi' && locale === 'vi' ? `${d.title} ${d.body} ${foldDiacritics(d.title)} ${foldDiacritics(d.body)}` : `${d.title} ${d.body}`,
      })),
    );
    sizes[locale] = gzipSync(JSON.stringify(await save(db))).length;
    buildMs[locale] = Math.round(performance.now() - t0);
    metrics.push(
      await score('orama', locale, qs, async (q) => {
        const t0 = performance.now();
        // ADAPTER: search may return a promise; await handles both
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r: any = await oramaSearch(db, { term: q.q, limit: 10 });
        latency.push(performance.now() - t0);
        return (r.hits ?? []).map((h: { document: { slug: string } }) => h.document.slug);
      }),
    );
  }
  return { metrics, sizes, latency, buildMs };
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function writePagefindSite(corpus: Record<Locale, CorpusDoc[]>): number {
  rmSync('.search-gate', { recursive: true, force: true });
  for (const locale of LOCALES) {
    for (const d of corpus[locale]) {
      const dir = path.join(SITE, locale);
      mkdirSync(dir, { recursive: true });
      const folded = d.lang === 'vi' && locale === 'vi' ? `<p data-pagefind-weight="0.5">${esc(foldDiacritics(d.title))} ${esc(foldDiacritics(d.body))}</p>` : '';
      writeFileSync(
        path.join(dir, `${d.slug}.html`),
        `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${esc(d.title)}</title></head>` +
          `<body data-pagefind-body><h1>${esc(d.title)}</h1><p>${esc(d.body)}</p>${folded}</body></html>`,
      );
    }
  }
  const t0 = Date.now();
  execSync(`pnpm exec pagefind --site ${SITE}`, { stdio: 'inherit' });
  return Date.now() - t0;
}

function gzipTree(dir: string, acc: { total: number; perLang: Record<string, number> }) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) gzipTree(f, acc);
    else {
      const n = gzipSync(readFileSync(f)).length;
      acc.total += n;
      const m = /^(?:pagefind\.)?(zh|vi|en)_/.exec(e.name);
      if (m) acc.perLang[m[1]] = (acc.perLang[m[1]] ?? 0) + n;
    }
  }
}

async function pagefindGate(corpus: Record<Locale, CorpusDoc[]>, qs: Q[]) {
  const buildMs = writePagefindSite(corpus);
  const siteRoot = path.resolve(SITE);
  const server = createServer((req, res) => {
    const f = path.resolve(siteRoot, '.' + decodeURIComponent((req.url ?? '/').split('?')[0]));
    if (f !== siteRoot && !f.startsWith(siteRoot + path.sep)) {
      res.statusCode = 403;
      res.end();
      return;
    }
    try {
      const data = readFileSync(f);
      res.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream');
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise<void>((r) => server.listen(4020, '127.0.0.1', r));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const fetched = new Set<string>();
    page.on('requestfinished', (req) => fetched.add(new URL(req.url()).pathname));

    const metrics: Metric[] = [];
    const latency: number[] = [];
    let firstSearchBytes = 0;
    for (const locale of LOCALES) {
      const mine = qs.filter((q) => q.locale === locale);
      const first = corpus[locale][0];
      if (!first) {
        metrics.push(await score('pagefind', locale, qs, () => []));
        continue;
      }
      // Pagefind 1.5.2 derives its language from <html lang> at init, so reload a page of this locale.
      await page.goto(`http://127.0.0.1:4020/${locale}/${first.slug}.html`);
      const results: Record<string, string[]> = {};
      let foreign = 0;
      for (const q of mine) {
        const t0 = Date.now();
        const r = await page.evaluate(
          async ({ term, loc }) => {
            // @ts-expect-error runtime import served by the static server
            const pf = await import('/pagefind/pagefind.js');
            const res = await pf.search(term);
            const top = await Promise.all(res.results.slice(0, 10).map((x: { data: () => Promise<{ url: string }> }) => x.data()));
            const own: string[] = [];
            let other = 0;
            for (const d of top as { url: string }[]) {
              const p = new URL(d.url, location.href).pathname;
              if (p.startsWith(`/${loc}/`)) own.push(p.split('/').pop()!.replace(/\.html$/, ''));
              else other += 1;
            }
            return { own, other };
          },
          { term: q.q, loc: locale },
        );
        latency.push(Date.now() - t0);
        foreign += r.other;
        results[q.q + '|' + q.kind] = r.own;
        if (!firstSearchBytes) {
          await page.waitForLoadState('networkidle');
          firstSearchBytes = [...fetched]
            .filter((p) => p.startsWith('/pagefind/'))
            .reduce((s, p) => s + gzipSync(readFileSync(path.join(SITE, p))).length, 0);
        }
      }
      const m = await score('pagefind', locale, qs, (q) => results[q.q + '|' + q.kind] ?? []);
      m.foreign = foreign;
      metrics.push(m);
    }
    const idx = { total: 0, perLang: {} as Record<string, number> };
    gzipTree(path.join(SITE, 'pagefind'), idx);
    return { metrics, firstSearchBytes, latency, buildMs, totalIndexBytes: idx.total, perLangBytes: idx.perLang };
  } finally {
    await browser.close();
    server.close();
  }
}

const ratio = (m: Metric | undefined) => (!m || m.queries === 0 ? 'n/a' : (m.hit10 / m.queries).toFixed(2));

function verdict(ms: Metric[], bytes: number) {
  const zh = ms.find((m) => m.locale === 'zh');
  const vi = ms.find((m) => m.locale === 'vi');
  const zhOk = !!zh && zh.queries > 0 && zh.hit10 / zh.queries >= 0.9;
  const viOk = vi && vi.queries > 0 ? vi.failures.every((f) => !f.startsWith('title-no-accents')) : null;
  const sizeOk = bytes <= 300 * 1024;
  const state = (v: boolean | null) => (v === null ? 'not evaluated' : v ? 'pass' : 'fail');
  const overall =
    !zhOk || !sizeOk || viOk === false
      ? 'fail'
      : viOk === null
        ? 'provisional (vi accent check not evaluated)'
        : 'pass';
  return `zh hit@10 ${state(zhOk)}, vi accent-insensitive ${state(viOk)}, size ${state(sizeOk)} => ${overall}`;
}

const p50 = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

async function main() {
  const root = contentRoot();
  const corpus = Object.fromEntries(LOCALES.map((l) => [l, buildCorpus(root, COLLECTION, l)])) as Record<Locale, CorpusDoc[]>;
  const qs = buildQueries(corpus);
  const orama = await oramaGate(corpus, qs);
  const pf = await pagefindGate(corpus, qs);

  const lines = [
    '# Search engine decision (generated by scripts/search-gate/run.ts)',
    '',
    `Date: ${new Date().toISOString().slice(0, 10)}. Pass bar: zh hit@10 >= 0.9, accent-insensitive vi titles all hit (not evaluated when there are no vi queries), first-search transfer <= 300 KB gzip.`,
    '',
    '| engine | locale | queries | hit@10 | hit@10 ratio | top1 | foreign-language results | failures |',
    '|---|---|---|---|---|---|---|---|',
    ...[...orama.metrics, ...pf.metrics].map(
      (m) =>
        `| ${m.engine} | ${m.locale} | ${m.queries} | ${m.queries === 0 ? 'n/a' : m.hit10} | ${ratio(m)} | ${m.queries === 0 ? 'n/a' : m.top1} | ${m.foreign ?? 'n/a'} | ${m.failures.join('; ') || '-'} |`,
    ),
    '',
    `- orama gzip index size per locale (bytes): ${JSON.stringify(orama.sizes)}`,
    `- pagefind first-search transfer (gzip bytes): ${pf.firstSearchBytes}`,
    `- pagefind total index size (gzip bytes): ${pf.totalIndexBytes}; per language: ${JSON.stringify(pf.perLangBytes)}`,
    `- orama build time per locale (ms, create+insertMultiple+save): ${JSON.stringify(orama.buildMs)}`,
    `- pagefind build time (ms, pagefind --site run): ${pf.buildMs}`,
    `- orama query latency p50 (ms): ${orama.latency.length ? p50(orama.latency).toFixed(2) : 'n/a'}`,
    `- pagefind query latency p50 (ms, includes page.evaluate): ${pf.latency.length ? p50(pf.latency) : 'n/a'}`,
    '',
    `- orama: ${verdict(orama.metrics, orama.sizes.zh)}`,
    `- pagefind: ${verdict(pf.metrics, pf.firstSearchBytes)}`,
    '',
    'Notes: Orama uses the Mandarin tokenizer for zh and a Unicode letter/digit splitter (no stemming) for vi/en, because its default english splitter breaks accented Vietnamese tokens. Pagefind language is taken from <html lang>, so the runner reloads a page of each locale before querying; results outside the locale folder are counted as foreign and never count as hits.',
    '',
    '## Decision',
    '(owner/main session fills after reading the table: if both pass choose the smaller first-search transfer; if only one passes choose it; if neither passes add a custom bigram tokenizer for zh and re-run)',
    '',
  ];
  const out = lines.join('\n');
  const primary = 'docs/superpowers/decisions/search-engine.md';
  try {
    mkdirSync(path.dirname(primary), { recursive: true });
    writeFileSync(primary, out);
  } catch (e) {
    mkdirSync('.search-gate', { recursive: true });
    writeFileSync('.search-gate/search-engine-decision.md', out);
    console.error(`could not write ${primary}; wrote .search-gate/search-engine-decision.md`, e);
  }
  console.log(out);
}

if (path.basename(process.argv[1] ?? '') === 'run.ts') {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
