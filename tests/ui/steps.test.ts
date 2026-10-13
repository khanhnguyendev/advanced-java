import { describe, expect, it } from 'vitest';
import { docShape, stepsFor } from '@/lib/steps';

const qa = [
  { depth: 2, text: '面试题' },
  { depth: 2, text: '面试官心理分析' },
  { depth: 2, text: '面试题剖析' },
  { depth: 3, text: '细节' },
];

describe('docShape', () => {
  it('detects the three-part interview shape from the zh headings', () => {
    expect(docShape(qa)).toBe('qa');
  });
  it('is plain for tutorial and problem/solution docs', () => {
    expect(docShape([{ depth: 2, text: 'Hystrix 是什么？' }, { depth: 2, text: 'Hystrix 的历史' }])).toBe('plain');
    expect(docShape([{ depth: 2, text: '题目描述' }, { depth: 2, text: '解答思路' }, { depth: 2, text: '方法总结' }])).toBe(
      'plain',
    );
  });
});

describe('stepsFor', () => {
  const hs = [
    { index: 1, depth: 2, text: 'A', id: 'h1-a' },
    { index: 2, depth: 3, text: 'A1', id: 'h2-a1' },
    { index: 3, depth: 2, text: 'B', id: 'h3-b' },
    { index: 4, depth: 2, text: 'C', id: 'h4-c' },
    { index: 5, depth: 2, text: 'D', id: 'h5-d' },
  ];
  it('numbers the h2 headings and labels the first three for qa docs', () => {
    const s = stepsFor(hs, 'qa');
    expect(s.map((x) => [x.number, x.labelKey, x.id])).toEqual([
      [1, 'question', 'h1-a'],
      [2, 'psychology', 'h3-b'],
      [3, 'answer', 'h4-c'],
      [4, null, 'h5-d'],
    ]);
  });
  it('uses plain numbers for other docs', () => {
    expect(stepsFor(hs, 'plain').every((x) => x.labelKey === null)).toBe(true);
  });
});
