import { describe, expect, it } from 'vitest';
import { describeBody, stripMarkdown, truncate } from '@/lib/description';

describe('describeBody', () => {
  it('uses the first non-heading paragraph', () => {
    expect(describeBody('# Title\n\n## Interview question\n\nHow do you scale reads?')).toBe('How do you scale reads?');
  });
  it('skips a leading blockquote', () => {
    expect(describeBody('# T\n\n> Translated from a site.<br> Please correct me.\n\nReal prose here.')).toBe('Real prose here.');
  });
  it('skips a leading list when a paragraph follows', () => {
    expect(describeBody('# T\n\n- a\n- b\n\nParagraph wins.')).toBe('Paragraph wins.');
  });
  it('falls back to the list or quote when there is no paragraph', () => {
    expect(describeBody('# T\n\n- first item\n- second')).toBe('first item');
    expect(describeBody('# T\n\n> only a quote')).toBe('only a quote');
  });
  it('skips an image-only paragraph', () => {
    expect(describeBody('# T\n\n![sketch](diagram:a/b/c)\n\nAfter the image.')).toBe('After the image.');
  });
  it('skips a fenced code block placed first, including headings-like lines inside', () => {
    expect(describeBody('# T\n\n```java\nclass A {}\n# not a heading\n```\n\nProse after code.')).toBe('Prose after code.');
    expect(describeBody('~~~\ncode\n~~~\n\nProse.')).toBe('Prose.');
  });
  it('returns null for an empty or code-only body', () => {
    expect(describeBody('# T\n\n```\nx\n```\n')).toBeNull();
    expect(describeBody('')).toBeNull();
  });
  it('strips links, code, images, emphasis and footnote markers', () => {
    expect(describeBody('A **bold** [link](http://x.y) with `code` and ![i](a.png) note[1] here[^2].')).toBe(
      'A bold link with code and note here.',
    );
  });
  it('collapses whitespace across wrapped lines', () => {
    expect(describeBody('one\n  two\n\n\n')).toBe('one two');
  });
  it('handles CJK, skipping the leading blockquote', () => {
    const body = '# 标题\n\n> 翻译自某网站。\n\n过去几年中出现了“微服务架构”这一术语[1]，它描述了将软件应用程序设计为若干个可独立部署的服务套件的特定方法。尽管这种架构风格尚未有精确的定义，但它们还是存在着某些共同特征。';
    const out = describeBody(body)!;
    expect([...out].length).toBeLessThanOrEqual(80);
    expect(out.startsWith('过去几年中出现了')).toBe(true);
    expect(out).not.toContain('[1]');
    expect(out.endsWith('。') || out.endsWith('…')).toBe(true);
  });
});

describe('describeBody: weak openings', () => {
  const long = 'Sentinel is a lightweight flow control component that protects services from overload in production.';
  it('skips a first paragraph ending in a colon when a later paragraph exists', () => {
    expect(describeBody(`# T\n\nWhat the interviewer mainly wants to see is:\n\n${long}`)).toBe(long);
  });
  it('skips a short first paragraph when a later paragraph exists', () => {
    expect(describeBody(`# T\n\nInterviewer: Hello.\n\n${long}`)).toBe(long);
  });
  it('joins following list items when no later paragraph exists', () => {
    expect(describeBody('# T\n\nSee Hystrix Home.\n\n- Hystrix is a latency library.\n- It is in maintenance mode.\n- Third item here.')).toBe(
      'See Hystrix Home. Hystrix is a latency library. It is in maintenance mode.',
    );
  });
  it('applies the CJK length threshold', () => {
    expect(describeBody('# T\n\n简介：\n\n这是一个足够长的正文段落，用来描述这篇文档的内容。')).toBe('这是一个足够长的正文段落，用来描述这篇文档的内容。');
  });
});

describe('describeBody: markdown edge cases', () => {
  const long = 'This paragraph is long enough to be chosen as the description of the page.';
  it('keeps Java generics inside code spans', () => {
    expect(describeBody(`Use \`List<String>\` and <b>bold</b> here, which is long enough to stand alone as one.`)).toBe(
      'Use List<String> and bold here, which is long enough to stand alone as one.',
    );
  });
  it('skips an indented (4-space) code block', () => {
    expect(describeBody(`# T\n\n    int x = 1;\n    foo();\n\n${long}`)).toBe(long);
  });
  it('skips a GFM table without leading pipes', () => {
    expect(describeBody(`# T\n\nName | Value\n--- | ---\na | b\n\n${long}`)).toBe(long);
  });
  it('decodes HTML entities', () => {
    expect(describeBody('Fish&nbsp;&amp;&nbsp;chips are served here with a long enough sentence to count as prose.')).toBe(
      'Fish & chips are served here with a long enough sentence to count as prose.',
    );
  });
});

describe('truncate', () => {
  it('leaves short text alone', () => {
    expect(truncate('Short one.')).toBe('Short one.');
  });
  it('cuts at a sentence boundary within 155 chars', () => {
    const first = 'This first sentence is long enough to be worth keeping on its own as the description of the page.';
    expect(truncate(first + ' ' + 'word '.repeat(60))).toBe(first);
  });
  it('cuts at a word boundary with an ellipsis and never exceeds 155', () => {
    const out = truncate('alpha '.repeat(80).trim());
    expect([...out].length).toBeLessThanOrEqual(155);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/alph…$/);
  });
  it('limits CJK to 80 characters', () => {
    const out = truncate('微'.repeat(200));
    expect([...out].length).toBeLessThanOrEqual(80);
  });
});

describe('stripMarkdown', () => {
  it('removes html tags', () => {
    expect(stripMarkdown('a<br>b <b>c</b>')).toBe('a b c');
  });
});
