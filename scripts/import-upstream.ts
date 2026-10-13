import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import type { CollectionConfig, LocaleMeta } from '../lib/content/types';
import { extractHeadings, firstH1 } from '../lib/render/headings';
import { remapFragment } from './import/anchors';
import { disallowedHtml } from './import/html-guard';
import { classifyLink, rewriteLinkTargets, type LinkEnv } from './import/links';
import { SECTION_PREFIXES, loadSidebar, placeUnlisted, planFromSidebar, readmeOrder } from './import/sidebar';

export interface ImportOptions {
  upstreamRoot: string;
  outRoot: string;
  collection: string;
  commit: string;
  prefixes?: Record<string, string>;
  repo?: string;
  force?: boolean; // overwrite an existing import of this collection
}
export interface ImportResult { docCount: number; reportPath: string }

function walk(dir: string, base: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === '.vitepress' || name === 'node_modules' || name === 'public') continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, base));
    else if (name.endsWith('.md')) out.push('docs/' + path.relative(base, full).split(path.sep).join('/'));
  }
  return out.sort();
}

export function runImport(opts: ImportOptions): ImportResult {
  const prefixes = opts.prefixes ?? SECTION_PREFIXES;
  const repo = opts.repo ?? 'https://github.com/doocs/advanced-java';
  const docsDir = path.join(opts.upstreamRoot, 'docs');
  const errors: string[] = [];
  if (!opts.force && existsSync(path.join(opts.outRoot, opts.collection, 'collection.json'))) {
    throw new Error(
      `${path.join(opts.outRoot, opts.collection, 'collection.json')} already exists; the import runs once (pass force to overwrite)`,
    );
  }

  // 1. plan from sidebar, then place unlisted docs by the root README
  let plan = planFromSidebar(loadSidebar(path.join(docsDir, '.vitepress/config.mts')));
  const allMd = walk(docsDir, docsDir);
  const readmes = new Map<string, string>();
  for (const s of plan.sections) readmes.set(`docs/${s.id}/README.md`, s.id);
  const listed = new Set(Object.values(plan.docs).map((d) => d.upstreamFile));
  const skipped: { file: string; reason: string }[] = [];
  const promos = new Set<string>();
  const unlisted: string[] = [];

  for (const f of allMd) {
    if (listed.has(f)) continue;
    if (f === 'docs/index.md') skipped.push({ file: f, reason: 'home page replaced by our own' });
    else if (f.startsWith('docs/extra-page/')) {
      promos.add(f);
      skipped.push({
        file: f,
        reason: f === 'docs/extra-page/README.md' ? 'promo section index, not imported' : 'promo page, not imported',
      });
    } else if (/^docs\/[^/]+\/README\.md$/.test(f)) skipped.push({ file: f, reason: 'section index, generated from collection.json' });
    else unlisted.push(f);
  }
  const readme = readmeOrder(readFileSync(path.join(opts.upstreamRoot, 'README.md'), 'utf8'));
  try {
    plan = placeUnlisted(plan, readme, unlisted);
  } catch (e) {
    errors.push((e as Error).message);
  }
  const placed: { file: string; after: string }[] = [];
  for (const f of unlisted) {
    const d = Object.values(plan.docs).find((x) => x.upstreamFile === f);
    if (!d) continue;
    const group = plan.sections.flatMap((s) => s.groups).find((g) => g.docs.includes(d.slug));
    const prev = group ? group.docs[group.docs.indexOf(d.slug) - 1] : undefined;
    placed.push({ file: f, after: prev ? plan.docs[prev]?.upstreamFile ?? prev : '(group start)' });
  }
  for (const s of plan.sections) if (!prefixes[s.id]) errors.push(`no catalog prefix for section ${s.id}`);

  // 2. catalog ids in section → group → doc order
  const ids: Record<string, string> = {};
  for (const s of plan.sections) {
    let n = 0;
    for (const g of s.groups) for (const slug of g.docs) ids[slug] = `${prefixes[s.id] ?? 'XX'}-${String(++n).padStart(2, '0')}`;
  }

  // 3. per-doc processing (in memory)
  const slugByUpstream = new Map(Object.values(plan.docs).map((d) => [d.upstreamFile, { section: d.section, slug: d.slug }]));
  const outputs: { section: string; slug: string; text: string }[] = [];
  const assets = new Map<string, { from: string; section: string; slug: string; file: string; bytes: number }>();
  let assetRefs = 0;
  const titleDiffs: { slug: string; h1: string; nav: string }[] = [];
  const meta: LocaleMeta = { sections: {}, groups: {}, docs: {} };

  for (const s of plan.sections) {
    meta.sections[s.id] = s.title;
    for (const g of s.groups) meta.groups[g.id] = g.title;
  }

  for (const doc of Object.values(plan.docs)) {
    const srcPath = path.join(opts.upstreamRoot, doc.upstreamFile);
    const md = readFileSync(srcPath, 'utf8');

    for (const bad of disallowedHtml(md)) errors.push(`${doc.upstreamFile}:${bad.line}: raw HTML <${bad.tag}> is not allowed`);

    const headings = extractHeadings(md);
    const h1 = firstH1(md);
    if (!h1 && !doc.navTitle) errors.push(`${doc.upstreamFile}: no H1 and no sidebar title`);
    meta.docs[doc.slug] = { title: h1 ?? doc.navTitle, navTitle: doc.navTitle };
    if (h1 && h1 !== doc.navTitle) titleDiffs.push({ slug: doc.slug, h1, nav: doc.navTitle });

    const env: LinkEnv = {
      collection: opts.collection,
      sourceFile: doc.upstreamFile,
      slugByUpstream,
      sectionReadmes: readmes,
      promos,
      assetFor: (sourceFile, rel) => {
        const abs = path.join(opts.upstreamRoot, path.posix.dirname(sourceFile), rel);
        if (!existsSync(abs)) return undefined;
        const file = path.basename(abs);
        const key = `${doc.section}/${doc.slug}/${file}`;
        const prior = assets.get(key);
        if (prior && prior.from !== abs) {
          errors.push(`${sourceFile}: image destination ${key} collides: ${prior.from} vs ${abs}`);
        } else if (!prior) {
          assets.set(key, { from: abs, section: doc.section, slug: doc.slug, file, bytes: statSync(abs).size });
        }
        assetRefs++;
        return `asset:${doc.section}/${doc.slug}/${file}`;
      },
    };

    const { text, unlocatable } = rewriteLinkTargets(md, (url) => {
      if (url.startsWith('#')) {
        try {
          return `#h${remapFragment(url, headings)}`;
        } catch (e) {
          errors.push(`${doc.upstreamFile}: ${(e as Error).message}`);
          return null;
        }
      }
      const c = classifyLink(url, env);
      if (c && typeof c === 'object' && 'fail' in c) {
        errors.push(c.fail);
        return null;
      }
      return c;
    });
    for (const u of unlocatable) errors.push(`${doc.upstreamFile}: cannot locate link destination "${u}" in source`);
    outputs.push({ section: doc.section, slug: doc.slug, text });
  }

  if (errors.length) throw new Error(`import failed with ${errors.length} problem(s):\n- ` + errors.join('\n- '));

  // 4. write
  const root = path.join(opts.outRoot, opts.collection);
  for (const o of outputs) {
    const f = path.join(root, 'zh', o.section, `${o.slug}.md`);
    mkdirSync(path.dirname(f), { recursive: true });
    writeFileSync(f, o.text);
  }
  for (const a of assets.values()) {
    const dest = path.join(root, '_assets', a.section, a.slug, a.file);
    mkdirSync(path.dirname(dest), { recursive: true });
    cpSync(a.from, dest);
  }

  const collection: CollectionConfig = {
    id: opts.collection,
    sourceLocale: 'zh',
    tabColor: '#2f5bea',
    fallback: { vi: ['en', 'zh'], en: ['zh'], zh: ['zh'] },
    sections: plan.sections.map((s) => ({
      id: s.id,
      prefix: prefixes[s.id],
      groups: s.groups.map((g) => ({ id: g.id, docs: g.docs, ...(g.lead ? { lead: g.lead } : {}) })),
    })),
    ids,
    upstream: { repo, commit: opts.commit },
    upstreamFiles: Object.fromEntries(Object.values(plan.docs).map((d) => [d.slug, d.upstreamFile])),
  };
  writeFileSync(path.join(root, 'collection.json'), JSON.stringify(collection, null, 2) + '\n');
  writeFileSync(path.join(root, 'zh', 'meta.json'), JSON.stringify(meta, null, 2) + '\n');

  // 5. report
  const renamed = Object.values(plan.docs).filter((d) => path.posix.basename(d.upstreamFile, '.md') !== d.slug);
  const lines = [
    `# Import report`,
    '',
    `- upstream: ${repo} @ ${opts.commit}`,
    `- docs imported: ${outputs.length}`,
    `- sections: ${plan.sections.map((s) => s.id).join(', ')}`,
    `- images copied: ${assets.size} (${assetRefs} image references)`,
    '',
    '## Skipped files',
    ...skipped.map((s) => `- ${s.file}: ${s.reason}`),
    '',
    `## Unlisted docs placed via root README (${placed.length})`,
    ...(placed.length ? placed.map((p) => `- ${p.file} (placed after ${p.after})`) : ['- none']),
    '',
    '## External sidebar entries skipped',
    ...(plan.external.length ? plan.external.map((e) => `- ${e}`) : ['- none']),
    '',
    '## Renamed slugs',
    ...(renamed.length ? renamed.map((d) => `- ${d.upstreamFile} -> ${d.slug}`) : ['- none']),
    '',
    `## H1 differs from sidebar title (${titleDiffs.length}); both kept (docTitle / navTitle)`,
    ...titleDiffs.map((t) => `- ${t.slug}: "${t.h1}" vs "${t.nav}"`),
    '',
    '## Images (provenance unknown; see content/ASSETS.md)',
    ...[...assets.values()].map((a) => `- ${a.section}/${a.slug}/${a.file} (${a.bytes} bytes)`),
    '',
  ];
  const reportPath = path.join(root, 'import-report.md');
  writeFileSync(reportPath, lines.join('\n'));
  return { docCount: outputs.length, reportPath };
}

if (path.basename(process.argv[1] ?? '') === 'import-upstream.ts') {
  const commit = execSync('git -C ref rev-parse HEAD').toString().trim();
  const r = runImport({ upstreamRoot: 'ref', outRoot: 'content', collection: 'advanced-java', commit });
  console.log(`imported ${r.docCount} docs; report: ${r.reportPath}`);
}
