import { describe, expect, it } from 'vitest';
import { canonicalHash, CANON_VERSION } from '@/lib/content/hash';

const FENCE = '```';
const base = [
  '# Title',
  '',
  'First paragraph with *emphasis* and a [link](doc:demo/alpha/second).',
  '',
  '- one',
  '- two',
  '',
  '| a | b |',
  '| - | - |',
  '| 1 | 2 |',
  '',
  FENCE + 'java',
  'int  x = 1;',
  FENCE,
  '',
  'Use `a  b` here.',
  '',
].join('\n');

describe('canonicalHash', () => {
  it('has the versioned prefix', () => {
    expect(canonicalHash(base)).toMatch(/^sha256:v1:[0-9a-f]{64}$/);
    expect(CANON_VERSION).toBe('v1');
  });

  it('ignores CRLF and a BOM', () => {
    expect(canonicalHash('\uFEFF' + base.replace(/\n/g, '\r\n'))).toBe(canonicalHash(base));
  });

  it('ignores whitespace-only blank lines', () => {
    expect(canonicalHash(base.replace(/\n\n/g, '\n   \n'))).toBe(canonicalHash(base));
  });

  it('ignores line re-wrapping inside a paragraph', () => {
    const wrapped = base.replace('First paragraph with *emphasis* and', 'First paragraph\nwith *emphasis*\nand');
    expect(canonicalHash(wrapped)).toBe(canonicalHash(base));
  });

  it('ignores table padding and delimiter dash counts', () => {
    const padded = base.replace('| a | b |\n| - | - |\n| 1 | 2 |', '| a   | b   |\n| --- | --- |\n| 1   | 2   |');
    expect(canonicalHash(padded)).toBe(canonicalHash(base));
  });

  it('ignores bullet and emphasis marker characters', () => {
    const alt = base.replace('- one\n- two', '* one\n* two').replace('*emphasis*', '_emphasis_');
    expect(canonicalHash(alt)).toBe(canonicalHash(base));
  });

  it('ignores a leading frontmatter block', () => {
    expect(canonicalHash('---\nstatus: machine\n---\n' + base)).toBe(canonicalHash(base));
  });

  it('changes when whitespace inside a code block changes', () => {
    expect(canonicalHash(base.replace('int  x = 1;', 'int x = 1;'))).not.toBe(canonicalHash(base));
  });

  it('changes when whitespace inside an inline code span changes', () => {
    expect(canonicalHash(base.replace('`a  b`', '`a b`'))).not.toBe(canonicalHash(base));
  });

  it('changes when prose, link target or heading changes', () => {
    expect(canonicalHash(base.replace('First paragraph', 'Second paragraph'))).not.toBe(canonicalHash(base));
    expect(canonicalHash(base.replace('doc:demo/alpha/second', 'doc:demo/alpha/third'))).not.toBe(canonicalHash(base));
    expect(canonicalHash(base.replace('# Title', '## Title'))).not.toBe(canonicalHash(base));
  });

  it('keeps a hard break significant', () => {
    expect(canonicalHash('a  \nb\n')).not.toBe(canonicalHash('a\nb\n'));
  });

  it('hashes reference-style link targets and labels', () => {
    const ref = 'See [x][r].\n\n[r]: doc:demo/a/b\n';
    expect(canonicalHash(ref.replace('a/b', 'a/c'))).not.toBe(canonicalHash(ref));
    expect(canonicalHash(ref.replace('[x][r]', '[x][s]').replace('[r]:', '[s]:'))).not.toBe(canonicalHash(ref));
    expect(canonicalHash(ref.replace('[x][r]', '[x][s]'))).not.toBe(canonicalHash(ref));
  });

  it('includes code fence meta', () => {
    const a = FENCE + 'java {1,3}\nx\n' + FENCE + '\n';
    expect(canonicalHash(a.replace('{1,3}', '{2}'))).not.toBe(canonicalHash(a));
  });

  it('does not treat a ---- line as a frontmatter delimiter', () => {
    expect(canonicalHash('---\na\n----\nb\n')).not.toBe(canonicalHash('b\n'));
    expect(canonicalHash('---\n---\nbody\n')).toBe(canonicalHash('body\n'));
  });

  it('ignores CJK line re-wrapping', () => {
    expect(canonicalHash('中文\n文字\n')).toBe(canonicalHash('中文文字\n'));
    expect(canonicalHash('中文\n文本\n')).not.toBe(canonicalHash('中文文字\n'));
  });

  it('treats indented and unlabeled fenced code as equal', () => {
    expect(canonicalHash('    x = 1\n')).toBe(canonicalHash(FENCE + '\nx = 1\n' + FENCE + '\n'));
  });

  it('collapses whitespace in raw html', () => {
    expect(canonicalHash('<div   class="a">\n\n')).toBe(canonicalHash('<div class="a">\n\n'));
  });

  it('keeps table alignment significant', () => {
    expect(canonicalHash('| a |\n| :-- |\n| 1 |\n')).not.toBe(canonicalHash('| a |\n| --- |\n| 1 |\n'));
  });
});
