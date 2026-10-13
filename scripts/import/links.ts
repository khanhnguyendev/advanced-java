import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';

export type Rewrite = string | { unwrap: true } | null;
export type LinkKind = 'link' | 'image';

export function rewriteLinkTargets(
  md: string,
  fn: (url: string, kind: LinkKind) => Rewrite,
): { text: string; unlocatable: string[] } {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(md);
  const edits: { start: number; end: number; text: string }[] = [];
  const unlocatable: string[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visit(tree, (node: any) => {
    if (node.type !== 'link' && node.type !== 'image' && node.type !== 'definition') return;
    const kind: LinkKind = node.type === 'image' ? 'image' : 'link';
    const r = fn(node.url, kind);
    if (r === null) return;
    const start: number = node.position.start.offset;
    const end: number = node.position.end.offset;
    const slice = md.slice(start, end);
    const isUnwrap = typeof r === 'object';
    // Raw destination must be followed by `)`, whitespace or `>`; otherwise the
    // decoded url may only be a prefix of what is written in the source.
    const terminated = (i: number) => i < slice.length && /[)\s>]/.test(slice[i]);

    if (node.type === 'definition') {
      const colon = slice.indexOf(']:');
      const at = colon === -1 ? -1 : slice.indexOf(node.url, colon);
      if (at === -1 || !terminated(at + node.url.length) || isUnwrap) return void unlocatable.push(node.url);
      edits.push({ start: start + at, end: start + at + node.url.length, text: r });
      return;
    }

    if (node.type === 'image') {
      if (isUnwrap) return void unlocatable.push(node.url);
      const marker = '](' + node.url;
      const at = slice.lastIndexOf(marker);
      if (at === -1 || !terminated(at + marker.length)) return void unlocatable.push(node.url);
      edits.push({ start: start + at + 2, end: start + at + 2 + node.url.length, text: r });
      return;
    }

    // link: destination must start right after the label
    const labelEnd: number = node.children?.at(-1)?.position?.end?.offset ?? start + 1;
    const marker = '](' + node.url;
    if (!md.startsWith(marker, labelEnd) || !terminated(labelEnd - start + marker.length)) {
      return void unlocatable.push(node.url);
    }
    const at = labelEnd - start;
    if (isUnwrap) {
      // two small deletions so nested edits (e.g. a rewritten image) never overlap
      edits.push({ start, end: start + 1, text: '' }, { start: start + at, end, text: '' });
      return;
    }
    edits.push({ start: start + at + 2, end: start + at + 2 + node.url.length, text: r });
  });

  edits.sort((a, b) => b.start - a.start);
  for (let i = 1; i < edits.length; i++) {
    if (edits[i].end > edits[i - 1].start) throw new Error('overlapping link edits');
  }
  let text = md;
  for (const e of edits) text = text.slice(0, e.start) + e.text + text.slice(e.end);
  return { text, unlocatable };
}

export interface LinkEnv {
  collection: string;
  sourceFile: string; // upstream key of the doc being processed: 'docs/<section>/<file>.md'
  slugByUpstream: Map<string, { section: string; slug: string }>;
  sectionReadmes: Map<string, string>; // 'docs/<section>/README.md' -> section id
  promos: Set<string>;
  assetFor: (sourceFile: string, relPath: string) => string | undefined; // -> 'asset:<section>/<slug>/<file>'
}
export type Classified = Rewrite | { fail: string };

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const IMAGE = /\.(png|jpe?g|gif|svg|webp)$/i;

export function classifyLink(url: string, env: LinkEnv): Classified {
  if (SCHEME.test(url) || url.startsWith('#') || url.startsWith('//')) return null;
  const hashAt = url.indexOf('#');
  const pathPart = hashAt === -1 ? url : url.slice(0, hashAt);
  const frag = hashAt === -1 ? '' : url.slice(hashAt);

  if (IMAGE.test(pathPart)) {
    const a = env.assetFor(env.sourceFile, pathPart);
    return a ? a : { fail: `image not found for ${url} (from ${env.sourceFile})` };
  }
  if (!/\.md$/i.test(pathPart)) return { fail: `unsupported internal link target ${url} (from ${env.sourceFile})` };

  let key: string;
  if (pathPart.startsWith('/docs/')) key = pathPart.slice(1);
  else if (pathPart.startsWith('/')) key = 'docs' + pathPart;
  else key = path.posix.normalize(path.posix.join(path.posix.dirname(env.sourceFile), pathPart));

  const doc = env.slugByUpstream.get(key);
  if (doc) return `doc:${env.collection}/${doc.section}/${doc.slug}${frag}`;
  const sec = env.sectionReadmes.get(key);
  if (sec || key === 'docs/index.md') {
    if (frag !== '') return { fail: `fragment not supported on section/home link ${url} (from ${env.sourceFile})` };
    return sec ? `section:${env.collection}/${sec}` : 'home:';
  }
  if (env.promos.has(key)) return { unwrap: true };
  return { fail: `unresolved internal link ${url} -> ${key} (from ${env.sourceFile})` };
}
