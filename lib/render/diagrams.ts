import type { Element, ElementContent, Root as HastRoot } from 'hast';
import type { Image, Paragraph, Root } from 'mdast';
import { SKIP, visit } from 'unist-util-visit';
import { diagramSvgMarkup, diagramSvgUrl } from '../diagrams/asset-path';
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

function label(labels: Record<string, string>, key: string): string {
  return Object.hasOwn(labels, key) && typeof labels[key] === 'string' ? labels[key]!.trim() : '';
}

/** hast stage, after sanitize: placeholders in the per-render list become figures whose SVG is a lazy
 * `.diagram-scroll[data-diagram-src]` slot (file emitted once at build time) with a `<noscript>` image fallback. */
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
      const svgText = diagramSvgMarkup(loaded.scene, labels, opts.bodyLocale, entry.index);
      const src = diagramSvgUrl(svgText);
      const { w: sceneW, h: sceneH } = loaded.scene.size;
      const name =
        [label(labels, loaded.scene.title_key), label(labels, loaded.scene.desc_key)].filter(Boolean).join('. ') || entry.alt;
      // the slot reproduces the svg's box exactly (width:100% with a 0.7w floor, height from the viewBox ratio)
      const slotStyle = `aspect-ratio: ${sceneW} / ${sceneH}; min-height: ${Math.round(0.7 * sceneH)}px`;
      const children: ElementContent[] = [
        {
          type: 'element',
          tagName: 'div',
          properties: { className: ['diagram-scroll'], dataDiagramSrc: src, role: 'img', ariaLabel: name, style: slotStyle },
          children: [
            {
              type: 'element',
              tagName: 'noscript',
              properties: {},
              children: [{ type: 'element', tagName: 'img', properties: { src, alt: name, loading: 'lazy', decoding: 'async', style: `min-width: ${Math.round(0.7 * sceneW)}px` }, children: [] }],
            },
          ],
        },
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
      parent.children[i] = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['diagram'], dataDiagram: entry.id },
        children,
      };
      return [SKIP, i + 1];
    });
  };
}
