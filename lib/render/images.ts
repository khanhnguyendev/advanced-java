import type { Element, Root } from 'hast';
import { SKIP, visit } from 'unist-util-visit';

export function rehypeRestrictImages(prefix = '/_content/') {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'img' || !parent || index === undefined) return;
      const src = node.properties?.src;
      if (typeof src === 'string' && src.startsWith(prefix)) return;
      parent.children.splice(index, 1);
      return [SKIP, index];
    });
  };
}
