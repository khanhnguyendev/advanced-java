import { describe, expect, it } from 'vitest';
import { commentFamily, stripComments } from '@/lib/check/comments';

describe('commentFamily', () => {
  it('maps languages to comment syntaxes', () => {
    expect(commentFamily('java')).toBe('c');
    expect(commentFamily('yaml')).toBe('hash');
    expect(commentFamily('xml')).toBe('xml');
    expect(commentFamily('sql')).toBe('sql');
    expect(commentFamily('json')).toBe('json');
    expect(commentFamily('diff')).toBe('none');
    expect(commentFamily(undefined)).toBe('none');
  });
});

describe('stripComments', () => {
  it('strips c-style line and block comments', () => {
    const code = 'int a = 1; // 初始化\n/* 多行\n注释 */\nint b = 2;';
    expect(stripComments(code, 'c').replace(/\s+/g, ' ').trim()).toBe('int a = 1; int b = 2;');
  });
  it('strips hash, xml and sql comments', () => {
    expect(stripComments('a: 1 # 注释', 'hash').trim()).toBe('a: 1');
    expect(stripComments('<a><!-- 注释 --></a>', 'xml')).toBe('<a></a>');
    expect(stripComments('select 1 -- 注释', 'sql').trim()).toBe('select 1');
  });
  it('leaves json and none untouched', () => {
    expect(stripComments('{"a": "//x"}', 'json')).toBe('{"a": "//x"}');
    expect(stripComments('# not a comment here', 'none')).toBe('# not a comment here');
  });
});
