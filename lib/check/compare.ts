import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { disallowedHtml } from '../../scripts/import/html-guard';
import { docFile, listDocs, loadCollection } from '../content/collection';
import { canonicalHash } from '../content/hash';
import type { DocFrontmatter, Locale } from '../content/types';
import { commentFamily, stripComments } from './comments';

export interface Issue { level: 'error' | 'warn'; code: string; message: string }

interface Facts {
  headings: number[];
  blocks: { lang: string; value: string }[];
  inline: string[];
  targets: string[];
  prose: string;
}

function facts(md: string): Facts {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(md);
  const f: Facts = { headings: [], blocks: [], inline: [], targets: [], prose: '' };
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

export function compareTranslation(zhMd: string, trMd: string, opts: { exceptions?: string[] } = {}): Issue[] {
  const out: Issue[] = [];
  const err = (code: string, message: string) => out.push({ level: 'error', code, message });
  let zh: Facts;
  let tr: Facts;
  try {
    zh = facts(zhMd);
    tr = facts(trMd);
  } catch (e) {
    return [{ level: 'error', code: 'parse', message: (e as Error).message }];
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

  const han = (tr.prose.match(/\p{Script=Han}/gu) ?? []).length;
  const letters = (tr.prose.match(/[\p{L}\p{N}]/gu) ?? []).length || 1;
  if (han > 5 && han / letters > 0.02) err('cjk-residue', `${han} Han characters remain in prose outside code`);

  if (zhMd.length > 50) {
    const ratio = trMd.length / zhMd.length;
    if (ratio < 0.8 || ratio > 8) {
      out.push({ level: 'warn', code: 'length-ratio', message: `length ratio ${ratio.toFixed(2)} outside [0.8, 8]` });
    }
  }

  const skip = new Set(opts.exceptions ?? []);
  return out.filter((i) => !skip.has(i.code));
}

export interface CheckReport { checked: number; errors: string[]; warnings: string[]; stale: string[] }

export function checkCollection(root: string, id: string): CheckReport {
  const c = loadCollection(root, id);
  const report: CheckReport = { checked: 0, errors: [], warnings: [], stale: [] };
  const exFile = path.join(root, id, 'translation-exceptions.json');
  const exceptions: Record<string, string[]> = existsSync(exFile) ? JSON.parse(readFileSync(exFile, 'utf8')) : {};

  for (const d of listDocs(c)) {
    const zhFile = docFile(root, id, c.sourceLocale, d.section, d.slug);
    if (!existsSync(zhFile)) {
      report.errors.push(`${c.sourceLocale}/${d.section}/${d.slug}: source file missing`);
      continue;
    }
    const zhBody = matter(readFileSync(zhFile, 'utf8')).content;
    const zhHash = canonicalHash(zhBody);

    for (const locale of (['en', 'vi'] as Locale[]).filter((l) => l !== c.sourceLocale)) {
      const file = docFile(root, id, locale, d.section, d.slug);
      if (!existsSync(file)) continue;
      const tag = `${locale}/${d.section}/${d.slug}`;
      report.checked += 1;
      const parsed = matter(readFileSync(file, 'utf8'));
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
      }

      const issues = compareTranslation(zhBody, parsed.content, { exceptions: exceptions[tag] });
      for (const i of issues) (i.level === 'error' ? report.errors : report.warnings).push(`${tag}: [${i.code}] ${i.message}`);
    }
  }
  return report;
}

export function restampTranslation(root: string, id: string, locale: Locale, slug: string): void {
  const c = loadCollection(root, id);
  const d = listDocs(c).find((x) => x.slug === slug);
  if (!d) throw new Error(`unknown slug ${slug}`);
  const zhBody = matter(readFileSync(docFile(root, id, c.sourceLocale, d.section, slug), 'utf8')).content;
  const file = docFile(root, id, locale, d.section, slug);
  const parsed = matter(readFileSync(file, 'utf8'));
  parsed.data.source = { ...(parsed.data.source ?? {}), hash: canonicalHash(zhBody) };
  writeFileSync(file, matter.stringify(parsed.content, parsed.data));
}
