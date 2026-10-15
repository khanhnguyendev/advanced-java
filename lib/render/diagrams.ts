import type { Element, ElementContent, Root as HastRoot } from 'hast';
import type { Image, Paragraph, Root } from 'mdast';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import { SKIP, visit } from 'unist-util-visit';
import { renderDiagram } from '../diagrams/render';
import type { DiagramAttribution, DiagramScene } from '../diagrams/types';
import type { Locale } from '../content/types';

export interface DiagramSource {
  /** `id` is `<section>/<slug>/<name>`; null when the diagram does not exist. */
  load(id: string): { scene: DiagramScene; labels: Partial<Record<Locale, Record<string, string>>>; attribution?: DiagramAttribution } | null;
}

export interface DiagramEntry {
  index: number;
  id: string;
  alt: string;
}

export interface DiagramRenderContext {
  bodyLocale: Locale;
  diagrams?: DiagramSource;
  /** one-line credit under every diagram */
  diagramCredit?: string;
  /** caption of a `third-party` diagram; must contain `attribution.title` verbatim, which becomes a link to `attribution.url` */
  diagramCreditThirdParty?: (a: DiagramAttribution) => string;
}

const SCHEME = 'diagram:';

function notFound(id: string): Error {
  return new Error(`diagram not found: ${id}`);
}

/** mdast stage: image nodes `diagram:<id>` become `<figure data-dg="<index>">` placeholders. */
export function remarkDiagrams(entries: DiagramEntry[], source: DiagramSource | undefined) {
  return (tree: Root) => {
    const take = (img: Image) => {
      const id = img.url.slice(SCHEME.length);
      if (id === '' || id.split(/[\\/]/).includes('..') || !source || !source.load(id)) throw notFound(id);
      const index = entries.length;
      entries.push({ index, id, alt: img.alt ?? '' });
      return { hName: 'figure', hProperties: { dataDg: String(index) } };
    };
    visit(tree, 'paragraph', (p: Paragraph, i, parent) => {
      const only = p.children.length === 1 ? p.children[0] : undefined;
      if (!only || only.type !== 'image' || !only.url.startsWith(SCHEME) || !parent || i === undefined) return;
      const data = take(only);
      parent.children[i] = { type: 'paragraph', children: [], data } as Paragraph;
      return [SKIP, i];
    });
    visit(tree, 'image', (img: Image) => {
      if (!img.url.startsWith(SCHEME)) return;
      img.data = take(img);
    });
  };
}

function parseSvg(svg: string): Element {
  const root = unified().use(rehypeParse, { fragment: true, space: 'svg' }).parse(svg) as HastRoot;
  const el = root.children.find((c): c is Element => c.type === 'element' && c.tagName === 'svg');
  if (!el) throw new Error('diagram render produced no <svg>');
  return el;
}

/** hast stage, after sanitize: placeholders in the per-render list become inline SVG figures. */
export function rehypeDiagrams(
  opts: { entries: DiagramEntry[]; source: DiagramSource | undefined; bodyLocale: Locale; credit: string; creditThirdParty?: (a: DiagramAttribution) => string },
) {
  return (tree: HastRoot) => {
    const used = new Set<number>();
    visit(tree, 'element', (node: Element, i, parent) => {
      if (node.tagName !== 'figure' || !parent || i === undefined) return;
      const raw = node.properties?.dataDg;
      if (raw === undefined) return;
      const entry = typeof raw === 'string' && /^\d+$/.test(raw) ? opts.entries[Number(raw)] : undefined;
      if (!entry || used.has(entry.index) || !opts.source) {
        parent.children.splice(i, 1);
        return [SKIP, i];
      }
      used.add(entry.index);
      const loaded = opts.source.load(entry.id);
      const labels = loaded?.labels[opts.bodyLocale];
      if (!loaded || !labels) throw notFound(entry.id);
      const svg = parseSvg(renderDiagram(loaded.scene, labels, opts.bodyLocale, `doc:${entry.index}`));
      svg.properties = { ...svg.properties, style: `min-width: ${Math.round(0.7 * loaded.scene.size.w)}px` };
      const { w: sceneW, h: sceneH } = loaded.scene.size;
      const baseH = Math.round((sceneH * Math.max(672, 0.7 * sceneW)) / sceneW);
      const children: ElementContent[] = [
        { type: 'element', tagName: 'div', properties: { className: ['diagram-scroll'] }, children: [svg] },
      ];
      if (loaded.scene.license === 'third-party') {
        const a = loaded.attribution;
        if (!a) throw new Error(`diagram ${entry.id}: license third-party but no attribution in source-credits.json`);
        const text = opts.creditThirdParty ? opts.creditThirdParty(a) : '';
        if (text) {
          const at = text.indexOf(a.title);
          const nodes: ElementContent[] =
            at < 0
              ? [{ type: 'text', value: text }]
              : [
                  ...(at > 0 ? [{ type: 'text', value: text.slice(0, at) } as ElementContent] : []),
                  {
                    type: 'element',
                    tagName: 'a',
                    properties: { href: a.url, rel: ['noopener', 'noreferrer'] },
                    children: [{ type: 'text', value: a.title }],
                  } as ElementContent,
                  ...(at + a.title.length < text.length ? [{ type: 'text', value: text.slice(at + a.title.length) } as ElementContent] : []),
                ];
          children.push({ type: 'element', tagName: 'figcaption', properties: { className: ['diagram-credit'] }, children: nodes });
        }
      } else if (opts.credit) {
        children.push({
          type: 'element',
          tagName: 'figcaption',
          properties: { className: ['diagram-credit'] },
          children: [{ type: 'text', value: opts.credit }],
        });
      }
      const intrinsicH = baseH + (children.length > 1 ? 24 : 0); // credit caption adds a line
      parent.children[i] = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['diagram'], dataDiagram: entry.id, style: `contain-intrinsic-block-size: auto ${intrinsicH}px` },
        children,
      };
      return [SKIP, i + 1];
    });
  };
}
