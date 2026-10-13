import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import { SKIP, visit } from 'unist-util-visit';
import { headingId } from './headings';

const LEVELS = new Set(['h2', 'h3', 'h4', 'h5', 'h6']);

// remark-rehype (GFM footnotes) emits <section data-footnotes> with <h2 id="footnote-label">.
// extractHeadings (mdast) never sees it, so it must not be counted or renamed.
function isFootnotes(node: Element): boolean {
  const p = node.properties ?? {};
  return p.dataFootnotes !== undefined || p['data-footnotes'] !== undefined;
}

export function rehypeHeadingIds() {
  return (tree: Root) => {
    let index = 0;
    visit(tree, 'element', (node: Element) => {
      if (isFootnotes(node)) return SKIP;
      if (!LEVELS.has(node.tagName)) return;
      if (node.properties?.id === 'footnote-label') return;
      index += 1;
      node.properties = {
        ...node.properties,
        id: headingId(index, toString(node).trim()),
        dataHi: String(index),
      };
    });
  };
}
