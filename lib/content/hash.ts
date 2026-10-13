import { createHash } from 'node:crypto';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

export const CANON_VERSION = 'v1';

const collapse = (s: string) => s.replace(/\s+/g, ' ');
const rtrimLines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');

function stripFrontmatter(src: string): string {
  const s = src.replace(/^﻿/, '').normalize('NFC').replace(/\r\n?/g, '\n');
  return s.replace(/^---\n[\s\S]*?\n---\n?/, '');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function emit(node: any, out: string[]): void {
  switch (node.type) {
    case 'text':
      out.push('t:' + collapse(node.value));
      return;
    case 'inlineCode':
      out.push('ic:' + node.value);
      return;
    case 'code':
      out.push(`code:${node.lang ?? ''}:` + rtrimLines(node.value));
      return;
    case 'html':
      out.push('html:' + collapse(String(node.value).trim()));
      return;
    case 'break':
      out.push('br');
      return;
    case 'image':
      out.push(`img:${node.url}:${node.title ?? ''}:${node.alt ?? ''}`);
      return;
    case 'heading':
      out.push('h' + node.depth);
      break;
    case 'list':
      out.push('list:' + (node.ordered ? 'o' + (node.start ?? 1) : 'u'));
      break;
    case 'link':
      out.push(`a:${node.url}:${node.title ?? ''}`);
      break;
    case 'table':
      out.push('table:' + (node.align ?? []).map((a: string | null) => a ?? 'n').join(','));
      break;
    default:
      out.push(node.type);
  }
  if (node.children) {
    for (const c of node.children) emit(c, out);
    out.push('/');
  }
}

export function canonicalStream(markdown: string): string[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(stripFrontmatter(markdown));
  const out: string[] = [];
  emit(tree, out);
  return out;
}

export function canonicalHash(markdown: string): string {
  const h = createHash('sha256').update(canonicalStream(markdown).join('\n')).digest('hex');
  return `sha256:${CANON_VERSION}:${h}`;
}
