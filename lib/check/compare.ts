import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { disallowedHtml } from '../../scripts/import/html-guard';
import { docFile, listDocs, loadCollection, loadMeta } from '../content/collection';
import { parse, zhHashOf } from '../content/fallback';
import { canonicalHash } from '../content/hash';
import { LOCALES } from '../content/types';
import { loadCredits } from '../content/credits';
import { isHeld, loadPolicy } from '../content/policy';
import { firstH1 } from '../render/headings';
import type { DocFrontmatter, Locale } from '../content/types';
import { commentFamily, stripComments } from './comments';

export interface Issue { level: 'error' | 'warn'; code: string; message: string }

interface Facts {
  headings: number[];
  blocks: { lang: string; value: string }[];
  inline: string[];
  targets: string[];
  prose: string;
  proseBlocks: string[];
}

function facts(md: string): Facts {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(md);
  const f: Facts = { headings: [], blocks: [], inline: [], targets: [], prose: '', proseBlocks: [] };
  const prose: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visit(tree, (node: any) => {
    switch (node.type) {
      case 'heading':
        f.headings.push(node.depth);
        break;
      case 'code':
        f.blocks.push({ lang: String(node.lang ?? '').toLowerCase(), value: node.value });
        break;
      case 'inlineCode':
        f.inline.push(node.value);
        break;
      case 'link':
      case 'image':
      case 'definition':
        f.targets.push(node.url);
        break;
      case 'text':
        prose.push(node.value);
        break;
    }
    if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'tableCell') {
      const parts: string[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      visit(node, 'text', (t: any) => {
        parts.push(t.value);
      });
      f.proseBlocks.push(parts.join(' '));
    }
  });
  f.prose = prose.join(' ');
  return f;
}

function diffMultiset(a: string[], b: string[]): string[] {
  const count = new Map<string, number>();
  for (const x of a) count.set(x, (count.get(x) ?? 0) + 1);
  for (const x of b) count.set(x, (count.get(x) ?? 0) - 1);
  return [...count.entries()].filter(([, n]) => n !== 0).map(([k, n]) => `${n > 0 ? '-' : '+'}${k}`);
}

const normBlock = (s: string) =>
  s
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l.trim() !== '')
    .join('\n');

/** Counts standalone lines made only of 4+ dashes, outside fenced code blocks. */
function strayDelimiters(md: string): number {
  let fence: string | null = null;
  let n = 0;
  for (const line of md.split('\n')) {
    const m = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (m) {
      if (fence === null) fence = m[1][0];
      else if (m[1][0] === fence) fence = null;
      continue;
    }
    if (fence === null && /^ {0,3}-{4,}[ \t]*$/.test(line)) n += 1;
  }
  return n;
}

export interface CompareOptions { exceptions?: string[]; locale?: Locale }
export interface CompareResult { issues: Issue[]; waived: Issue[]; sampled: number[] }

const LENGTH_BANDS: Partial<Record<Locale, [number, number]>> = { en: [1.2, 8], vi: [1.5, 10] };
const DEFAULT_BAND: [number, number] = [0.8, 8];

export function compareTranslationDetailed(zhMd: string, trMd: string, opts: CompareOptions = {}): CompareResult {
  const out: Issue[] = [];
  const sampled: number[] = [];
  const err = (code: string, message: string) => out.push({ level: 'error', code, message });
  let zh: Facts;
  let tr: Facts;
  try {
    zh = facts(zhMd);
    tr = facts(trMd);
  } catch (e) {
    // remark's parser does not throw on markdown input, so this is a defensive guard only.
    // Whether the document actually renders is verified by the site build, not by this check.
    return { issues: [{ level: 'error', code: 'parse', message: (e as Error).message }], waived: [], sampled };
  }

  if (zh.headings.join(',') !== tr.headings.join(',')) {
    err('heading-structure', `heading levels differ: zh [${zh.headings.join(',')}] vs translation [${tr.headings.join(',')}]`);
  }

  if (zh.blocks.length !== tr.blocks.length) {
    err('code-block-count', `fenced blocks: zh ${zh.blocks.length} vs translation ${tr.blocks.length}`);
  } else {
    zh.blocks.forEach((a, i) => {
      const b = tr.blocks[i];
      if (a.lang !== b.lang) return err('code-block-lang', `block ${i}: lang "${a.lang}" vs "${b.lang}"`);
      const textual = a.lang === '' || a.lang === 'text' || a.lang === 'txt';
      if (textual) {
        sampled.push(i);
        const la = normBlock(a.value).split('\n').length;
        const lb = normBlock(b.value).split('\n').length;
        if (la !== lb) err(`code-block-lines:${i}`, `text block ${i}: ${la} lines vs ${lb}`);
      } else {
        const fam = commentFamily(a.lang);
        if (normBlock(stripComments(a.value, fam)) !== normBlock(stripComments(b.value, fam))) {
          err(`code-block:${i}`, `code block ${i} (${a.lang}) differs outside comments`);
        }
      }
    });
  }

  const inline = diffMultiset(zh.inline, tr.inline);
  if (inline.length) err('inline-code', `inline code differs: ${inline.slice(0, 5).join(' | ')}`);

  const targets = diffMultiset(zh.targets, tr.targets);
  if (targets.length) err('link-targets', `link/asset targets differ: ${targets.slice(0, 5).join(' | ')}`);

  for (const h of disallowedHtml(trMd)) err('raw-html', `line ${h.line}: raw HTML <${h.tag}> is not allowed`);

  const strayZh = strayDelimiters(zhMd);
  const strayTr = strayDelimiters(trMd);
  if (strayTr > strayZh) {
    err('stray-delimiter', `translation has ${strayTr} standalone "-----" line(s), source has ${strayZh}`);
  }

  const hanOf = (t: string) => (t.match(/\p{Script=Han}/gu) ?? []).length;
  const lettersOf = (t: string) => (t.match(/[\p{L}\p{N}]/gu) ?? []).length || 1;
  const han = hanOf(tr.prose);
  const letters = lettersOf(tr.prose);
  if (han > 5 && han / letters > 0.02) {
    err('cjk-residue', `${han} Han characters remain in prose outside code`);
  } else {
    const bad = tr.proseBlocks.find((b) => hanOf(b) >= 8 && hanOf(b) / lettersOf(b) > 0.25);
    if (bad !== undefined) err('cjk-residue', `untranslated Han block: "${bad.slice(0, 40)}"`);
  }

  if (zhMd.length > 50) {
    const [lo, hi] = (opts.locale && LENGTH_BANDS[opts.locale]) || DEFAULT_BAND;
    const ratio = trMd.length / zhMd.length;
    if (ratio < lo || ratio > hi) {
      out.push({ level: 'warn', code: 'length-ratio', message: `length ratio ${ratio.toFixed(2)} outside [${lo}, ${hi}]` });
    }
  }

  const skip = new Set(opts.exceptions ?? []);
  return {
    issues: out.filter((i) => !skip.has(i.code)),
    waived: out.filter((i) => skip.has(i.code)),
    sampled,
  };
}

export function compareTranslation(zhMd: string, trMd: string, opts: CompareOptions = {}): Issue[] {
  return compareTranslationDetailed(zhMd, trMd, opts).issues;
}

export interface ExceptionEntry { code: string; reason: string }

export function loadExceptions(root: string, id: string): Record<string, ExceptionEntry[]> {
  const file = path.join(root, id, 'translation-exceptions.json');
  if (!existsSync(file)) return {};
  const bad = (why: string) => new Error(`${file}: ${why}`);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw bad(`invalid JSON (${(e as Error).message})`);
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw bad('expected an object keyed by "<locale>/<section>/<slug>"');
  const out: Record<string, ExceptionEntry[]> = {};
  for (const [key, list] of Object.entries(raw)) {
    if (!Array.isArray(list)) throw bad(`"${key}" must be an array of { code, reason }`);
    out[key] = list.map((e, n) => {
      if (typeof e !== 'object' || e === null) throw bad(`"${key}"[${n}] must be { code, reason }`);
      const { code, reason } = e as Record<string, unknown>;
      if (typeof code !== 'string' || code === '') throw bad(`"${key}"[${n}].code must be a non-empty string`);
      if (typeof reason !== 'string' || reason.trim() === '') throw bad(`"${key}"[${n}].reason must be a non-empty string`);
      return { code, reason };
    });
  }
  return out;
}

export interface CheckReport {
  checked: number;
  errors: string[];
  warnings: string[];
  stale: string[];
  reviewedChanged: string[];
  sampled: string[];
}

export function checkCollection(root: string, id: string): CheckReport {
  const c = loadCollection(root, id);
  const report: CheckReport = { checked: 0, errors: [], warnings: [], stale: [], reviewedChanged: [], sampled: [] };
  const exceptions = loadExceptions(root, id);
  const used = new Set<string>();
  const locales = LOCALES.filter((l) => l !== c.sourceLocale);
  const policy = loadPolicy(root, id);
  const credits = loadCredits(root, id);
  const docs = listDocs(c);
  const known = new Set(docs.map((d) => `${d.section}/${d.slug}`));
  for (const key of Object.keys(policy.hold)) {
    if (!known.has(key)) report.errors.push(`${key}: [policy-unknown-doc] translation-policy.json key matches no doc`);
  }
  for (const key of Object.keys(credits)) {
    if (!known.has(key)) report.errors.push(`${key}: [credit-unknown-doc] source-credits.json key matches no doc`);
  }
  const norm = (s: string) => s.normalize('NFC').replace(/\s+/g, ' ').trim();
  const metas = new Map(LOCALES.map((l) => [l, loadMeta(root, id, l)]));
  const titleGate = (locale: Locale, section: string, slug: string, body: string) => {
    const tag = `${locale}/${section}/${slug}`;
    const h1 = firstH1(body);
    if (h1 === undefined) return report.errors.push(`${tag}: [title-missing-h1] document has no depth-1 heading`);
    const title = metas.get(locale)?.docs[slug]?.title;
    if (title === undefined) return report.errors.push(`${tag}: [title-h1-mismatch] meta has no title for "${slug}" (H1 "${h1}")`);
    if (norm(title) !== norm(h1)) report.errors.push(`${tag}: [title-h1-mismatch] meta title "${title}" does not equal H1 "${h1}"`);
  };

  for (const d of docs) {
    const zhFile = docFile(root, id, c.sourceLocale, d.section, d.slug);
    if (!existsSync(zhFile)) {
      report.errors.push(`${c.sourceLocale}/${d.section}/${d.slug}: source file missing`);
      continue;
    }
    let zhBody: string;
    let zhHash: string;
    try {
      zhBody = parse(readFileSync(zhFile, 'utf8')).content;
      zhHash = zhHashOf(root, c, d.section, d.slug);
    } catch (e) {
      report.errors.push(`${c.sourceLocale}/${d.section}/${d.slug}: [parse] ${(e as Error).message}`);
      continue;
    }
    titleGate(c.sourceLocale, d.section, d.slug, zhBody);

    for (const locale of locales) {
      const file = docFile(root, id, locale, d.section, d.slug);
      if (!existsSync(file)) continue;
      const tag = `${locale}/${d.section}/${d.slug}`;
      report.checked += 1;
      if (isHeld(policy, d.section, d.slug)) {
        report.errors.push(`${tag}: [held-doc-translated] translation exists for a doc held by translation-policy.json`);
      }
      try {
        const parsed = parse(readFileSync(file, 'utf8'));
        titleGate(locale, d.section, d.slug, parsed.content);
        const fm = parsed.data as Partial<DocFrontmatter>;

        if (!fm.source || !fm.source.hash) report.errors.push(`${tag}: missing source frontmatter`);
        else {
          if (fm.source.locale !== c.sourceLocale)
            report.errors.push(`${tag}: must be translated directly from ${c.sourceLocale} (source.locale is "${fm.source.locale}")`);
          if (fm.source.slug !== d.slug) report.errors.push(`${tag}: source.slug "${fm.source.slug}" does not match`);
          if (fm.source.hash !== zhHash) report.stale.push(tag);
        }
        if (fm.status !== 'machine' && fm.status !== 'reviewed') {
          report.errors.push(`${tag}: status must be "machine" or "reviewed" (got "${String(fm.status)}")`);
        } else if (fm.status === 'reviewed' && fm.reviewedHash !== canonicalHash(parsed.content)) {
          report.reviewedChanged.push(tag);
          report.warnings.push(`${tag}: reviewed translation changed since review`);
        }

        const entries = exceptions[tag] ?? [];
        const r = compareTranslationDetailed(zhBody, parsed.content, { exceptions: entries.map((e) => e.code), locale });
        for (const i of r.issues) (i.level === 'error' ? report.errors : report.warnings).push(`${tag}: [${i.code}] ${i.message}`);
        for (const w of r.waived) {
          const e = entries.find((x) => x.code === w.code);
          used.add(`${tag}|${w.code}`);
          report.warnings.push(`${tag}: exception applied [${w.code}] (${e?.reason ?? ''})`);
        }
        for (const i of r.sampled) report.sampled.push(`${tag}: text-block:${i}`);
      } catch (e) {
        report.errors.push(`${tag}: [parse] ${(e as Error).message}`);
      }
    }
  }

  for (const [tag, entries] of Object.entries(exceptions)) {
    for (const e of entries) {
      if (!used.has(`${tag}|${e.code}`)) report.warnings.push(`${tag}: exception [${e.code}] matched nothing`);
    }
  }
  return report;
}

function locate(root: string, id: string, locale: Locale, slug: string) {
  const c = loadCollection(root, id);
  const d = listDocs(c).find((x) => x.slug === slug);
  if (!d) throw new Error(`unknown slug ${slug}`);
  const file = docFile(root, id, locale, d.section, slug);
  const parsed = parse(readFileSync(file, 'utf8'));
  const data = structuredClone(parsed.data) as Record<string, unknown>;
  if (data.translatedAt instanceof Date) data.translatedAt = data.translatedAt.toISOString().slice(0, 10);
  return { c, d, file, content: parsed.content, data };
}

export function restampTranslation(root: string, id: string, locale: Locale, slug: string): void {
  const { c, d, file, content, data } = locate(root, id, locale, slug);
  const source = (data.source ?? {}) as Record<string, unknown>;
  data.source = { ...source, hash: zhHashOf(root, c, d.section, slug) };
  writeFileSync(file, matter.stringify(content, data));
}

/** OWNER-ONLY: records that the owner has reviewed the current translation body. */
export function markReviewed(root: string, id: string, locale: Locale, slug: string): void {
  const { file, content, data } = locate(root, id, locale, slug);
  data.status = 'reviewed';
  data.reviewedHash = canonicalHash(content);
  writeFileSync(file, matter.stringify(content, data));
}
