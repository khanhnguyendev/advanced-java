/**
 * Meta-description derivation from a served markdown body (frontmatter already removed).
 * Pure: no I/O. The first plain paragraph wins; blockquotes, lists, tables, code, images and
 * headings are skipped unless nothing else exists.
 */

export const MAX_LATIN = 155;
export const MAX_CJK = 80;

const FENCE = /^\s{0,3}(```|~~~)/;
const HEADING = /^\s{0,3}#{1,6}(\s|$)/;
const QUOTE = /^\s{0,3}>/;
const LIST = /^\s{0,3}(?:[-*+]|\d+[.)])\s+/;
const TABLE = /^\s*\|/;
const HR = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const FOOTDEF = /^\s{0,3}\[\^?[^\]]+\]:\s/;
const HTML_BLOCK = /^\s{0,3}<\/?[a-zA-Z!]/;

const HAN = /[㐀-鿿豈-﫿]/u;

const ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", hellip: '…', mdash: '—', ndash: '–' };
const ENTITY = /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi;

function decodeEntities(s: string): string {
  return s.replace(ENTITY, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function stripMarkdown(s: string): string {
  // code spans are lifted out first so `List<String>` survives the tag stripping, then put back
  const spans: string[] = [];
  const lifted = s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/!\[[^\]]*\]\[[^\]]*\]/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    .replace(/\[\^?\d+\]/g, '')
    .replace(/(`+)([^`]*)\1/g, (_m, _t, code: string) => `${spans.push(code) - 1}`);
  const plain = lifted
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?[a-zA-Z][\w-]*(\s[^>]*)?>/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,;:!?]|$)/g, '$1$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/\\([\\`*_{}[\]()#+\-.!>|])/g, '$1');
  return decodeEntities(plain)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(\d+)/g, (_m, i: string) => spans[Number(i)]);
}

function isCjk(s: string): boolean {
  const chars = [...s].filter((c) => /\p{L}/u.test(c));
  if (chars.length === 0) return false;
  return chars.filter((c) => HAN.test(c)).length / chars.length > 0.3;
}

export function truncate(s: string, max?: number): string {
  const cjk = isCjk(s);
  const limit = max ?? (cjk ? MAX_CJK : MAX_LATIN);
  const chars = [...s];
  if (chars.length <= limit) return s;
  const head = chars.slice(0, limit - 1).join('');
  const ends = cjk ? /[。！？；]/g : /[.!?](?=\s)/g;
  let cut = -1;
  for (const m of head.matchAll(ends)) cut = m.index! + 1;
  if (cut >= head.length * 0.5) return head.slice(0, cut).trim();
  if (!cjk) {
    const sp = head.lastIndexOf(' ');
    const base = sp > head.length * 0.5 ? head.slice(0, sp) : head;
    return base.replace(/[\s,;:\-–—(]+$/, '') + '…';
  }
  return head.replace(/[\s，、；：（]+$/, '') + '…';
}

interface Block { kind: 'p' | 'loose'; text: string }

const INDENTED = /^( {4,}|\t)\S/;
const TABLE_DELIM = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function collect(body: string): Block[] {
  const blocks: Block[] = [];
  let buf: string[] = [];
  let kind: 'p' | 'loose' = 'p';
  let fence: string | null = null;
  let table = false;
  const flush = () => {
    if (buf.length) {
      const text = stripMarkdown(buf.join(' '));
      if (text && /[\p{L}\p{N}]/u.test(text)) blocks.push({ kind, text });
    }
    buf = [];
    kind = 'p';
  };
  for (const line of body.split(/\r?\n/)) {
    if (fence) {
      if (line.trim().startsWith(fence)) fence = null;
      continue;
    }
    if (table) {
      if (line.trim() === '') table = false;
      continue;
    }
    const f = FENCE.exec(line);
    if (f) {
      flush();
      fence = f[1];
      continue;
    }
    if (line.trim() === '') {
      flush();
      continue;
    }
    // a GFM table without a leading pipe: header line, then a delimiter row containing "|"
    if (line.includes('|') && TABLE_DELIM.test(line) && buf.length && buf[buf.length - 1].includes('|')) {
      buf.pop();
      flush();
      table = true;
      continue;
    }
    if (HEADING.test(line) || HR.test(line) || FOOTDEF.test(line) || TABLE.test(line) || HTML_BLOCK.test(line)) {
      flush();
      continue;
    }
    // an indented code block cannot interrupt a paragraph; at a block start it is code
    if (buf.length === 0 && INDENTED.test(line) && !LIST.test(line)) continue;
    const lead = QUOTE.test(line) ? 'quote' : LIST.test(line) ? 'list' : null;
    if (lead) {
      if (buf.length && (kind === 'p' || lead === 'list')) flush();
      kind = 'loose';
      buf.push(line.replace(QUOTE, '').replace(LIST, ''));
      continue;
    }
    buf.push(line);
  }
  flush();
  return blocks;
}

const JOIN_TARGET = 70;

function isWeak(text: string): boolean {
  if (/[:：]$/.test(text)) return true;
  return [...text].length < (isCjk(text) ? 15 : 40);
}

/** Description text from a markdown body, or null when the body has no usable prose. */
export function describeBody(body: string): string | null {
  const blocks = collect(body);
  const firstP = blocks.findIndex((b) => b.kind === 'p');
  if (firstP < 0) return blocks[0] ? truncate(blocks[0].text) : null;
  const solid = blocks.findIndex((b) => b.kind === 'p' && !isWeak(b.text));
  if (solid >= 0) return truncate(blocks[solid].text);
  // only weak paragraphs: keep the first and add what follows until the text is informative enough
  let text = blocks[firstP].text;
  for (let i = firstP + 1; i < blocks.length && [...text].length < JOIN_TARGET; i++) text += ' ' + blocks[i].text;
  return truncate(text);
}
