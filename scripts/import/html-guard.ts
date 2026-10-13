import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';

export const ALLOWED_HTML = new Set(['br', 'sub', 'sup', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption']);

export function disallowedHtml(md: string): { tag: string; line: number }[] {
  const out: { tag: string; line: number }[] = [];
  const seen = new Set<string>();
  const tree = unified().use(remarkParse).use(remarkGfm).parse(md);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visit(tree, 'html', (node: any) => {
    const re = /<\/?([A-Za-z][A-Za-z0-9-]*)/g;
    for (let m = re.exec(node.value); m; m = re.exec(node.value)) {
      const tag = m[1].toLowerCase();
      const line: number = node.position.start.line;
      const key = `${tag}:${line}`;
      if (ALLOWED_HTML.has(tag) || seen.has(key)) continue;
      seen.add(key); // an open and close tag on one line count once
      out.push({ tag, line });
    }
  });
  return out;
}
