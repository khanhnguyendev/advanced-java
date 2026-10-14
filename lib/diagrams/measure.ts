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
/** Table widths are exact advances; 4% absorbs hinting/kerning differences. */
export const SAFETY = 1.04;
export const NODE_PAD = 8;

/** Max text line width inside a node. A circle's safe area is its inscribed square. Used by gate and renderer alike. */
export function textMaxWidth(node: { shape: string; w: number }): number {
  return node.shape === 'circle' ? node.w * Math.SQRT1_2 : node.w - 2 * NODE_PAD;
}

const HAN = /[⺀-⿟　-〿぀-ヿ㐀-䶿一-鿿豈-﫿＀-￯\u{20000}-\u{3134F}]/u;

export function hasHan(s: string): boolean {
  return HAN.test(s);
}

/**
 * Advance width in em of printable ASCII in the UI font (Be Vietnam Pro, 13px), measured in the browser
 * with getComputedTextLength() and rounded up to 0.01em. Keep in sync with the font.
 */
const UI_EM: Record<string, number> = {
  "0": 0.68, "1": 0.39, "2": 0.66, "3": 0.67, "4": 0.72, "5": 0.67, "6": 0.69, "7": 0.60, "8": 0.64,
  "9": 0.69, "!": 0.29, "\"": 0.32, "#": 0.81, "$": 0.65, "%": 0.85, "&": 0.75, "'": 0.18, "(": 0.44,
  ")": 0.44, "*": 0.50, "+": 0.61, ",": 0.31, "-": 0.61, ".": 0.29, "/": 0.51, ":": 0.29, ";": 0.31,
  "<": 0.56, "=": 0.73, ">": 0.56, "?": 0.58, "@": 1.01, "A": 0.74, "B": 0.68, "C": 0.78, "D": 0.73,
  "E": 0.63, "F": 0.64, "G": 0.79, "H": 0.71, "I": 0.26, "J": 0.47, "K": 0.69, "L": 0.63, "M": 0.86,
  "N": 0.74, "O": 0.83, "P": 0.65, "Q": 0.83, "R": 0.67, "S": 0.64, "T": 0.65, "U": 0.73, "V": 0.71,
  "W": 1.01, "X": 0.73, "Y": 0.67, "Z": 0.67, "[": 0.46, "\\": 0.49, "]": 0.46, "^": 0.56, "_": 0.71,
  "`": 0.21, "a": 0.65, "b": 0.66, "c": 0.62, "d": 0.66, "e": 0.60, "f": 0.39, "g": 0.65, "h": 0.59,
  "i": 0.27, "j": 0.28, "k": 0.56, "l": 0.26, "m": 0.90, "n": 0.58, "o": 0.65, "p": 0.66, "q": 0.66,
  "r": 0.40, "s": 0.51, "t": 0.43, "u": 0.57, "v": 0.58, "w": 0.88, "x": 0.56, "y": 0.59, "z": 0.51,
  "{": 0.43, "|": 0.41, "}": 0.43, "~": 0.47,
};
/** Measured 0.231em; kept at the older, more generous value. */
const SPACE_EM = 0.28;
/** Fallback for a non-ASCII, non-Han character with no base letter in the table. */
export const UNKNOWN_EM = 0.7;
/** JetBrains Mono advances 0.601em; 0.62 leaves a margin. */
export const MONO_EM = 0.62;

/** Measured Han advance is 1.019em (26.5px for two characters at 13px). */
export const HAN_EM = 1.02;

/** Width in em of one character. */
function charEm(ch: string, mono: boolean): number {
  if (HAN.test(ch)) return HAN_EM;
  if (mono) return MONO_EM;
  if (ch === ' ') return SPACE_EM;
  const direct = UI_EM[ch];
  if (direct !== undefined) return direct;
  // Latin with diacritics (Vietnamese): the base letter's advance, measured equal to within 0.02em.
  const base = ch.normalize('NFD')[0]!;
  if (base !== ch) {
    const w = UI_EM[base];
    if (w !== undefined) return w + 0.03;
  }
  return UNKNOWN_EM;
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
