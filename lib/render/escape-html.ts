import type { Html, Paragraph, Parents, Root, RootContent, Text } from 'mdast';
import { SKIP, visit } from 'unist-util-visit';

const ALLOWED_RAW = new Set([
  'br', 'sub', 'sup', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  // img/picture/source stay raw so rehypeRestrictImages and sanitize (which unwraps
  // picture/source and strips srcset) police them instead of showing them as text.
  'img', 'picture', 'source',
]);

const COMMENT = /^<!--[\s\S]*-->\s*$/;

function tagNames(html: string): string[] {
  return Array.from(html.matchAll(/<\/?([A-Za-z][A-Za-z0-9-]*)/g), (m) => m[1].toLowerCase());
}

/**
 * Raw HTML that is not on the allowed list (prose generics such as List<String>,
 * stray <div>) is turned into literal text so it is never swallowed by sanitize.
 * HTML comments are dropped.
 */
export function remarkEscapeUnknownHtml() {
  return (tree: Root) => {
    visit(tree, 'html', (node: Html, index: number | undefined, parent: Parents | undefined) => {
      if (!parent || index === undefined) return;
      const value = node.value;
      if (COMMENT.test(value.trim())) {
        parent.children.splice(index, 1);
        return [SKIP, index];
      }
      const names = tagNames(value);
      if (names.length > 0 && names.every((n) => ALLOWED_RAW.has(n))) return;
      const text: Text = { type: 'text', value };
      let replacement: RootContent = text;
      if (parent.type !== 'paragraph' && parent.type !== 'heading' && parent.type !== 'tableCell') {
        const p: Paragraph = { type: 'paragraph', children: [text] };
        replacement = p;
      }
      (parent.children as RootContent[])[index] = replacement;
      return [SKIP, index + 1];
    });
  };
}
