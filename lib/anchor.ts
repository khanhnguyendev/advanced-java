export function parseHeadingHash(hash: string): number | null {
  const m = /^#?h(\d+)(?:-|$)/.exec(hash);
  return m ? Number(m[1]) : null;
}

function headingElements(root: ParentNode): Element[] {
  return Array.from(root.querySelectorAll('[data-hi]'));
}

export function findHeadingElement(root: ParentNode, index: number): Element | null {
  const els = headingElements(root);
  if (!els.length) return null;
  if (index < 1) return els[0];
  const exact = els.find((e) => e.getAttribute('data-hi') === String(index));
  if (exact) return exact;
  const last = Number(els[els.length - 1].getAttribute('data-hi'));
  if (index > last) return els[els.length - 1];
  let best: Element = els[0];
  for (const e of els) {
    if (Number(e.getAttribute('data-hi')) <= index) best = e;
  }
  return best;
}

export function resolveHashInDocument(doc: Document, hash: string): Element | null {
  const n = parseHeadingHash(hash);
  return n === null ? null : findHeadingElement(doc, n);
}

/** Bottom edge of the sticky top bar plus a gap larger than the heading scroll-margin (1rem); 96px when there is no bar. */
export function defaultHeadingOffset(root: ParentNode): number {
  const bar = root.querySelector('.topbar-slot');
  return bar ? bar.getBoundingClientRect().bottom + 24 : 96;
}

export function currentHeadingIndex(root: ParentNode, offset: number = defaultHeadingOffset(root)): number | null {
  let current: number | null = null;
  for (const el of headingElements(root)) {
    if (el.getBoundingClientRect().top <= offset) current = Number(el.getAttribute('data-hi'));
    else break;
  }
  return current;
}
