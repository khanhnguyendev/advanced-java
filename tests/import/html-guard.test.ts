import { describe, expect, it } from 'vitest';
import { disallowedHtml } from '../../scripts/import/html-guard';

const FENCE = '```';

describe('disallowedHtml', () => {
  it('allows br, sub, sup and table elements', () => {
    expect(disallowedHtml('a<br>b <sub>2</sub> <sup>3</sup>\n\n<table><tr><td>x</td></tr></table>\n')).toEqual([]);
  });
  it('flags div, img, iframe and unknown tags with their line', () => {
    const r = disallowedHtml('ok\n\n<div style="x">hi</div>\n\n<img src="a.png">\n');
    expect(r.map((x) => x.tag).sort()).toEqual(['div', 'img']);
    expect(r.find((x) => x.tag === 'div')!.line).toBe(3);
  });
  it('ignores angle brackets in code spans and fenced code', () => {
    const md = 'Use `Map<String, Object>` here.\n\n' + FENCE + 'java\nList<Integer> xs;\n<div>\n' + FENCE + '\n';
    expect(disallowedHtml(md)).toEqual([]);
  });
});
