import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
interface Metric { engine: string; locale: Locale; queries: number; hit10: number; top1: number; failures: string[] }

function buildQueries(corpus: Record<Locale, CorpusDoc[]>): Q[] {
  const out: Q[] = queries.zh.map((x) => ({ ...x, kind: 'hand', locale: 'zh' as Locale }));
  for (const locale of queries.derived.locales as Locale[]) {
    for (const slug of queries.derived.pilotSlugs) {
      const d = corpus[locale].find((x) => x.slug === slug);
      if (!d || d.fallback) continue; // only docs that are really translated
      out.push({ q: d.title, anyOf: [slug], kind: 'title', locale });
      out.push({ q: foldDiacritics(d.title), anyOf: [slug], kind: 'title-no-accents', locale });
    }
  }
  return out;
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
  for (const locale of LOCALES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let components: any;
    let language: string | undefined = 'english';
    if (locale === 'zh') {
      // ADAPTER: Mandarin tokenizer export from @orama/tokenizers/mandarin
      const mod = await import('@orama/tokenizers/mandarin');
      components = { tokenizer: await mod.createTokenizer() };
      language = undefined;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = await create({
      schema: { slug: 'string', title: 'string', body: 'string' } as const,
      ...(language ? { language } : {}),
      ...(components ? { components } : {}),
    });
    await insertMultiple(
      db,
      corpus[locale].map((d) => ({
        slug: d.slug,
        title: d.title,
        // index accented and folded forms so a query in either form matches
        body: locale === 'vi' ? `${d.title} ${d.body} ${foldDiacritics(d.title)} ${foldDiacritics(d.body)}` : `${d.title} ${d.body}`,
      })),
    );
    sizes[locale] = gzipSync(JSON.stringify(await save(db))).length;
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
  return { metrics, sizes, latency };
}

function writePagefindSite(corpus: Record<Locale, CorpusDoc[]>) {
  rmSync('.search-gate', { recursive: true, force: true });
  for (const locale of LOCALES) {
    for (const d of corpus[locale]) {
      const dir = path.join(SITE, locale);
      mkdirSync(dir, { recursive: true });
      const folded = locale === 'vi' ? `<p data-pagefind-weight="0.5">${foldDiacritics(d.title)} ${foldDiacritics(d.body)}</p>` : '';
      writeFileSync(
        path.join(dir, `${d.slug}.html`),
        `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${d.title}</title></head>` +
          `<body data-pagefind-body><h1>${d.title}</h1><p>${d.body.replace(/</g, '&lt;')}</p>${folded}</body></html>`,
      );
    }
  }
  execSync(`pnpm exec pagefind --site ${SITE}`, { stdio: 'inherit' });
}

async function pagefindGate(corpus: Record<Locale, CorpusDoc[]>, qs: Q[]) {
  writePagefindSite(corpus);
  const server = createServer((req, res) => {
    const f = path.join(SITE, decodeURIComponent((req.url ?? '/').split('?')[0]));
    try {
      const data = readFileSync(f);
      res.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream');
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise<void>((r) => server.listen(4020, r));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const fetched = new Set<string>();
  page.on('requestfinished', (req) => fetched.add(new URL(req.url()).pathname));
  await page.goto('http://localhost:4020/zh/why-mq.html');

  const metrics: Metric[] = [];
  const latency: number[] = [];
  let firstSearchBytes = 0;
  for (const locale of LOCALES) {
    const mine = qs.filter((q) => q.locale === locale);
    const results: Record<string, string[]> = {};
    for (const q of mine) {
      const t0 = Date.now();
      // ADAPTER: pagefind is imported at runtime from the served site; `language` option per locale
      const slugs: string[] = await page.evaluate(async ({ term, language }) => {
        // @ts-expect-error runtime import served by the static server
        const pf = await import('/pagefind/pagefind.js');
        await pf.options({ language });
        const r = await pf.search(term);
        const top = await Promise.all(r.results.slice(0, 10).map((x: { data: () => Promise<{ url: string }> }) => x.data()));
        return top.map((d: { url: string }) => d.url.split('/').pop()!.replace(/\.html$/, ''));
      }, { term: q.q, language: locale });
      latency.push(Date.now() - t0);
      results[q.q + '|' + q.kind] = slugs;
      if (!firstSearchBytes) {
        firstSearchBytes = [...fetched]
          .filter((p) => p.startsWith('/pagefind/'))
          .reduce((s, p) => s + gzipSync(readFileSync(path.join(SITE, p))).length, 0);
      }
    }
    metrics.push(await score('pagefind', locale, qs, (q) => results[q.q + '|' + q.kind] ?? []));
  }
  await browser.close();
  server.close();
  return { metrics, firstSearchBytes, latency };
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
    '| engine | locale | queries | hit@10 | hit@10 ratio | top1 | failures |',
    '|---|---|---|---|---|---|---|',
    ...[...orama.metrics, ...pf.metrics].map(
      (m) =>
        `| ${m.engine} | ${m.locale} | ${m.queries} | ${m.queries === 0 ? 'n/a' : m.hit10} | ${ratio(m)} | ${m.queries === 0 ? 'n/a' : m.top1} | ${m.failures.join('; ') || '-'} |`,
    ),
    '',
    `- orama gzip index size per locale (bytes): ${JSON.stringify(orama.sizes)}`,
    `- pagefind first-search transfer (gzip bytes): ${pf.firstSearchBytes}`,
    `- orama query latency p50 (ms): ${orama.latency.length ? p50(orama.latency).toFixed(2) : 'n/a'}`,
    `- pagefind query latency p50 (ms, includes page.evaluate): ${pf.latency.length ? p50(pf.latency) : 'n/a'}`,
    '',
    `- orama: ${verdict(orama.metrics, orama.sizes.zh)}`,
    `- pagefind: ${verdict(pf.metrics, pf.firstSearchBytes)}`,
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

if (path.basename(process.argv[1] ?? '') === 'run.ts') main();
