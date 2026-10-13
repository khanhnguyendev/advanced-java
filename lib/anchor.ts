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
  return els.find((e) => e.getAttribute('data-hi') === String(index)) ?? els[els.length - 1];
}

export function resolveHashInDocument(doc: Document, hash: string): Element | null {
  const n = parseHeadingHash(hash);
  return n === null ? null : findHeadingElement(doc, n);
}

export function currentHeadingIndex(root: ParentNode, offset = 96): number | null {
  let current: number | null = null;
  for (const el of headingElements(root)) {
    if (el.getBoundingClientRect().top <= offset) current = Number(el.getAttribute('data-hi'));
    else break;
  }
  return current;
}
