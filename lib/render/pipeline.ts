import type { Root } from 'mdast';
import { unified, type PluggableList } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema, type Options } from 'rehype-sanitize';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeStringify from 'rehype-stringify';
import { remarkEscapeUnknownHtml } from './escape-html';
import { rehypeHeadingIds } from './heading-ids';
import { extractHeadings, type HeadingInfo } from './headings';
import { rehypeRestrictImages } from './images';
import { rehypeResolveLinks, type LinkContext } from './links';
import { rehypeDiagrams, remarkDiagrams, type DiagramEntry, type DiagramRenderContext, type DiagramSource } from './diagrams';

/**
 * The page header renders the title, so the body's title H1 is dropped (code fences are code nodes, untouched).
 * Only the first top-level heading qualifies, and only when it is depth 1: a later `# Part` in a doc
 * without a leading title stays.
 */
function remarkStripFirstH1() {
  return (tree: Root) => {
    const i = tree.children.findIndex((n) => n.type === 'heading');
    const first = tree.children[i];
    if (first && first.type === 'heading' && first.depth === 1) tree.children.splice(i, 1);
  };
}

/**
 * The parse + mdast steps shared by the page pipeline and `diagramEntriesOf`, so the diagram indexes
 * (instance ids `doc:<index>`) assigned at build time and at render time cannot drift.
 */
function markdownSteps(entries: DiagramEntry[], source: DiagramSource | undefined): PluggableList {
  return [
    remarkParse,
    remarkGfm,
    remarkEscapeUnknownHtml,
    remarkStripFirstH1,
    [remarkDiagrams, entries, source],
  ];
}

/** Diagram entries of a markdown body, in the order (and with the indexes) `renderMarkdown` assigns. */
export function diagramEntriesOf(md: string, source: DiagramSource | undefined): DiagramEntry[] {
  const entries: DiagramEntry[] = [];
  const proc = unified().use(markdownSteps(entries, source));
  proc.runSync(proc.parse(md));
  return entries;
}

const base = defaultSchema.attributes ?? {};

// Attributes never allowed: ids/names are produced only by our own plugin after sanitize
// (clobberPrefix is '' so user ids/names would enable DOM clobbering); srcset can load remote images.
const BLOCKED_ATTRS = new Set(['id', 'name', 'srcset']);
const keepAttr = (a: string | [string, ...unknown[]]) =>
  !BLOCKED_ATTRS.has((Array.isArray(a) ? a[0] : a).toLowerCase());

const attributes: NonNullable<Options['attributes']> = {};
for (const [tag, list] of Object.entries(base)) {
  if (tag === 'source') continue;
  attributes[tag] = (list as Array<string | [string, ...unknown[]]>).filter(keepAttr) as never;
}

export const sanitizeSchema: Options = {
  ...defaultSchema,
  clobberPrefix: '',
  tagNames: Array.from(
    new Set([...(defaultSchema.tagNames ?? []), 'br', 'sub', 'sup']),
  ).concat('figure', 'figcaption').filter((t) => t !== 'picture' && t !== 'source'),
  attributes: {
    ...attributes,
    code: [...(attributes.code ?? []), ['className', /^language-./]],
    img: ['src', 'alt', 'title', 'width', 'height'],
    // placeholder only; rehypeDiagrams resolves indexes present in the doc's own image nodes
    figure: [['dataDg', /^\d+$/]],
  },
  // img src protocol policy (only /_content/) is enforced by rehypeRestrictImages, which runs
  // before sanitize; the default http/https src protocols are kept as a second layer.
  protocols: { ...defaultSchema.protocols, href: ['http', 'https', 'mailto'] },
};

/** Guards mdast/hast heading parity: one data-hi per heading found by extractHeadings. */
export function assertHeadingParity(html: string, expected: number): void {
  const actual = (html.match(/<h[2-6]\s[^>]*\bdata-hi="/g) ?? []).length;
  if (actual !== expected) {
    throw new Error(
      `heading parity violated: rendered output has ${actual} data-hi heading(s) but extractHeadings found ${expected}`,
    );
  }
}

export async function renderMarkdown(
  md: string,
  ctx: Omit<LinkContext, 'currentHeadings'> & { currentHeadings?: HeadingInfo[] } & Partial<DiagramRenderContext>,
  opts?: { docRef?: string },
): Promise<{ html: string; headings: HeadingInfo[] }> {
  try {
    const headings = extractHeadings(md);
    const entries: DiagramEntry[] = [];
    const file = await unified()
      .use(markdownSteps(entries, ctx.diagrams))
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeResolveLinks, { ...ctx, currentHeadings: headings })
      .use(rehypeRestrictImages)
      .use(rehypeSanitize, sanitizeSchema)
      .use(rehypeDiagrams, {
        entries,
        source: ctx.diagrams,
        bodyLocale: ctx.bodyLocale ?? ctx.routeLocale,
        credit: ctx.diagramCredit ?? '',
        ...(ctx.diagramCreditThirdParty ? { creditThirdParty: ctx.diagramCreditThirdParty } : {}),
      })
      .use(rehypeHeadingIds)
      .use(rehypePrettyCode, { theme: { light: 'github-light', dark: 'github-dark' }, keepBackground: false })
      .use(rehypeStringify)
      .process(md);
    const html = String(file);
    assertHeadingParity(html, headings.length);
    return { html, headings };
  } catch (e) {
    if (opts?.docRef) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`(in ${opts.docRef}) ${msg}`, { cause: e });
    }
    throw e;
  }
}
