import { describe, expect, it } from 'vitest';
import { compareTranslation } from '@/lib/check/compare';

const F = '```';
const zh = [
  '# 为什么使用消息队列？',
  '',
  '## 面试题',
  '',
  '使用 `Kafka` 和 `RabbitMQ`，参见 [另一篇](doc:c/s/other) 和 ![图](asset:s/why/d.png)。',
  '',
  F + 'java',
  'int a = 1; // 初始化',
  F,
  '',
  F,
  '┌──中文──┐',
  '│ 队列 │',
  F,
  '',
].join('\n');

const good = [
  '# Why use a message queue?',
  '',
  '## Interview question',
  '',
  'Use `Kafka` and `RabbitMQ`, see [another](doc:c/s/other) and ![diagram](asset:s/why/d.png).',
  '',
  F + 'java',
  'int a = 1; // initialize',
  F,
  '',
  F,
  '┌─ENG─┐',
  '│ queue │',
  F,
  '',
].join('\n');

const codes = (i: { code: string }[]) => i.map((x) => x.code);

describe('compareTranslation', () => {
  it('passes a faithful translation (translated code comment and diagram text allowed)', () => {
    expect(compareTranslation(zh, good).filter((i) => i.level === 'error')).toEqual([]);
  });
  it('fails when heading structure differs', () => {
    const bad = good.replace('## Interview question', '### Interview question');
    expect(codes(compareTranslation(zh, bad))).toContain('heading-structure');
  });
  it('fails when code (not a comment) changes', () => {
    const bad = good.replace('int a = 1;', 'int a = 2;');
    expect(codes(compareTranslation(zh, bad))).toContain('code-block:0');
  });
  it('fails when a code block language tag changes or a block is dropped', () => {
    expect(codes(compareTranslation(zh, good.replace(F + 'java', F + 'kotlin')))).toContain('code-block-lang');
    expect(codes(compareTranslation(zh, good.replace(/\n```\n┌─ENG─┐[\s\S]*$/, '\n')))).toContain('code-block-count');
  });
  it('fails when a text diagram changes its line count', () => {
    const bad = good.replace('│ queue │\n', '');
    expect(codes(compareTranslation(zh, bad))).toContain('code-block-lines:1');
  });
  it('fails when an inline code span is altered', () => {
    expect(codes(compareTranslation(zh, good.replace('`Kafka`', '`kafka`')))).toContain('inline-code');
  });
  it('fails when a link or asset target is altered', () => {
    expect(codes(compareTranslation(zh, good.replace('doc:c/s/other', 'doc:c/s/else')))).toContain('link-targets');
    expect(codes(compareTranslation(zh, good.replace('asset:s/why/d.png', 'asset:s/why/e.png')))).toContain('link-targets');
  });
  it('fails on residual Han text outside code', () => {
    const bad = good.replace('Use `Kafka`', '请使用这个消息队列系统来解耦。Use `Kafka`');
    expect(codes(compareTranslation(zh, bad))).toContain('cjk-residue');
  });
  it('fails on raw html that is not allowed (a valid-looking tag would vanish at render)', () => {
    const bad = good.replace('Use `Kafka`', 'Use <T> and `Kafka`');
    expect(codes(compareTranslation(zh, bad))).toContain('raw-html');
  });
  it('honours reviewed exceptions by issue code', () => {
    const bad = good.replace('`Kafka`', '`kafka`');
    const r = compareTranslation(zh, bad, { exceptions: ['inline-code'] });
    expect(codes(r)).not.toContain('inline-code');
  });
  it('allows an English paragraph that mentions a Han name twice', () => {
    const en = 'This is a long english paragraph explaining things in detail. '.repeat(20);
    const z = '# 标题\n\n内容。\n';
    const t = `# Title\n\n${en}\n\nThis article was originally written by 中华石杉 in the advanced-java project, and the author 中华石杉 also maintains the upstream repository with many related interview questions.\n`;
    expect(codes(compareTranslation(z, t))).not.toContain('cjk-residue');
  });
  it('flags one untranslated zh paragraph inside a long English doc', () => {
    const en = 'This is a long english paragraph explaining things in detail. '.repeat(90);
    const han = '这是一段没有被翻译的中文段落需要被检查工具发现并且报告为错误因为它很长很长很长很长很长很长很长很长。';
    const z = '# 标题\n\n内容。\n';
    const t = `# Title\n\n${en}\n\n${han}\n`;
    expect(codes(compareTranslation(z, t))).toContain('cjk-residue');
  });
  it('uses per-locale length bands', () => {
    const z = '# 标题\n\n' + '内容很多的一段话。'.repeat(20) + '\n';
    const t = '# Title\n\n' + 'x'.repeat(z.length - 20) + '\n';
    expect(codes(compareTranslation(z, t, { locale: 'en' }))).toContain('length-ratio');
    expect(codes(compareTranslation(z, t))).not.toContain('length-ratio');
  });
});
