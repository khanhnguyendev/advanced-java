export interface Seg {
  text: string;
  mono: boolean;
}
export interface Line {
  segs: Seg[];
  width: number;
}

export const FONT_SIZE = 13;
export const LINE_HEIGHT = 1.3;
export const SAFETY = 1.08;
export const NODE_PAD = 8;

/** Max text line width inside a node. A circle's safe area is its inscribed square. Used by gate and renderer alike. */
export function textMaxWidth(node: { shape: string; w: number }): number {
  return node.shape === 'circle' ? node.w * Math.SQRT1_2 : node.w - 2 * NODE_PAD;
}

const HAN = /[⺀-⿟　-〿぀-ヿ㐀-䶿一-鿿豈-﫿＀-￯\u{20000}-\u{3134F}]/u;

export function hasHan(s: string): boolean {
  return HAN.test(s);
}

/** Width in em of one character. */
function charEm(ch: string, mono: boolean): number {
  if (HAN.test(ch)) return 1.0;
  if (mono) return 0.62;
  if (ch === ' ') return 0.28;
  if (/[0-9]/.test(ch)) return 0.58;
  if (/\p{Lu}/u.test(ch)) return 0.68;
  return 0.56;
}

export function segWidth(seg: Seg, fontSize = FONT_SIZE): number {
  let em = 0;
  for (const ch of seg.text) em += charEm(ch, seg.mono);
  return em * fontSize * SAFETY;
}

export function textWidth(segs: Seg[], fontSize = FONT_SIZE): number {
  return segs.reduce((n, s) => n + segWidth(s, fontSize), 0);
}

/** Split text into segments; declared literals become mono segments (longest first, left to right). */
export function splitSegments(text: string, literals: string[] = []): Seg[] {
  const lits = [...new Set(literals.filter((l) => l.length > 0))].sort((a, b) => b.length - a.length);
  const out: Seg[] = [];
  let buf = '';
  let i = 0;
  while (i < text.length) {
    const hit = lits.find((l) => text.startsWith(l, i));
    if (hit) {
      if (buf) out.push({ text: buf, mono: false });
      buf = '';
      out.push({ text: hit, mono: true });
      i += hit.length;
    } else {
      buf += text[i];
      i += 1;
    }
  }
  if (buf) out.push({ text: buf, mono: false });
  return out;
}

/** Text with every declared literal removed (for the Han-in-Latin check). */
export function stripLiterals(text: string, literals: string[] = []): string {
  return splitSegments(text, literals)
    .filter((s) => !s.mono)
    .map((s) => s.text)
    .join('');
}

interface Word {
  segs: Seg[];
  spaceBefore: boolean;
}

function toWords(segs: Seg[]): Word[] {
  const words: Word[] = [];
  let cur: Seg[] = [];
  let curSpace = false;
  let pendingSpace = false;
  const flush = () => {
    if (cur.length) words.push({ segs: cur, spaceBefore: curSpace });
    cur = [];
  };
  const append = (seg: Seg) => {
    if (cur.length === 0) {
      curSpace = pendingSpace;
      pendingSpace = false;
    }
    const last = cur[cur.length - 1];
    if (last && last.mono === seg.mono) last.text += seg.text;
    else cur.push({ ...seg });
  };
  for (const seg of segs) {
    if (seg.mono) {
      append(seg);
      continue;
    }
    for (const ch of seg.text) {
      if (ch === ' ') {
        flush();
        pendingSpace = true;
      } else if (HAN.test(ch)) {
        flush();
        append({ text: ch, mono: false });
        flush();
      } else {
        append({ text: ch, mono: false });
      }
    }
  }
  flush();
  return words;
}

function mergeSegs(segs: Seg[]): Seg[] {
  const out: Seg[] = [];
  for (const s of segs) {
    const last = out[out.length - 1];
    if (last && last.mono === s.mono) last.text += s.text;
    else out.push({ ...s });
  }
  return out;
}

/**
 * Wrap text to maxWidth. `\n` is a hard break. Break at spaces (Latin/Vietnamese) or between
 * any Han characters; never inside a literal. A word wider than maxWidth stays on its own line.
 */
export function wrapText(text: string, literals: string[] = [], maxWidth: number, fontSize = FONT_SIZE): Line[] {
  const lines: Line[] = [];
  for (const para of text.split('\n')) {
    const words = toWords(splitSegments(para, literals));
    let cur: Seg[] = [];
    let curW = 0;
    const push = () => {
      lines.push({ segs: mergeSegs(cur), width: curW });
      cur = [];
      curW = 0;
    };
    for (const w of words) {
      const ww = textWidth(w.segs, fontSize);
      const sp = cur.length > 0 && w.spaceBefore ? segWidth({ text: ' ', mono: false }, fontSize) : 0;
      if (cur.length > 0 && curW + sp + ww > maxWidth) push();
      const useSp = cur.length > 0 && w.spaceBefore;
      if (useSp) {
        cur.push({ text: ' ', mono: false });
        curW += segWidth({ text: ' ', mono: false }, fontSize);
      }
      cur.push(...w.segs);
      curW += ww;
    }
    push();
  }
  return lines;
}
