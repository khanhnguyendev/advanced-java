import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';
import { visit } from 'unist-util-visit';

export interface HeadingInfo { index: number; depth: number; text: string; id: string }

export function readableSlug(text: string): string {
  const s = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return Array.from(s).slice(0, 48).join('').replace(/-+$/, '');
}

export function headingId(index: number, text: string): string {
  const s = readableSlug(text);
  return s ? `h${index}-${s}` : `h${index}`;
}

function parse(md: string) {
  return unified().use(remarkParse).use(remarkGfm).parse(md);
}

export function extractHeadings(md: string): HeadingInfo[] {
  const out: HeadingInfo[] = [];
  let index = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visit(parse(md), 'heading', (node: any) => {
    if (node.depth < 2) return;
    index += 1;
    const text = toString(node, { includeHtml: false, includeImageAlt: false }).trim();
    out.push({ index, depth: node.depth, text, id: headingId(index, text) });
  });
  return out;
}

export function firstH1(md: string): string | undefined {
  let found: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visit(parse(md), 'heading', (node: any) => {
    if (node.depth === 1 && found === undefined) found = toString(node, { includeHtml: false, includeImageAlt: false }).trim();
  });
  return found;
}
