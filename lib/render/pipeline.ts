import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema, type Options } from 'rehype-sanitize';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeStringify from 'rehype-stringify';
import { rehypeHeadingIds } from './heading-ids';
import { extractHeadings, type HeadingInfo } from './headings';
import { rehypeRestrictImages } from './images';
import { rehypeResolveLinks, type LinkContext } from './links';

const base = defaultSchema.attributes ?? {};

export const sanitizeSchema: Options = {
  ...defaultSchema,
  clobberPrefix: '',
  tagNames: Array.from(new Set([...(defaultSchema.tagNames ?? []), 'br', 'sub', 'sup'])),
  attributes: {
    ...base,
    // ids are produced only by our own plugin, after sanitize
    '*': (base['*'] ?? []).filter((a) => (Array.isArray(a) ? a[0] : a) !== 'id'),
    code: [...(base.code ?? []), ['className', /^language-./]],
    img: ['src', 'alt', 'title', 'width', 'height'],
  },
  protocols: { ...defaultSchema.protocols, href: ['http', 'https', 'mailto'], src: [] },
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
  ctx: LinkContext,
  opts?: { docRef?: string },
): Promise<{ html: string; headings: HeadingInfo[] }> {
  try {
    const file = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeResolveLinks, ctx)
      .use(rehypeRestrictImages)
      .use(rehypeSanitize, sanitizeSchema)
      .use(rehypeHeadingIds)
      .use(rehypePrettyCode, { theme: { light: 'github-light', dark: 'github-dark' }, keepBackground: false })
      .use(rehypeStringify)
      .process(md);
    const html = String(file);
    const headings = extractHeadings(md);
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
