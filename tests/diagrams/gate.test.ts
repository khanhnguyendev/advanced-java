import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '@/lib/diagrams/gate';
import { listDiagrams } from '@/lib/diagrams/load';
import { runGate } from '@/scripts/check-diagrams';
import type { DiagramScene, GateCode, LabelsByLocale } from '@/lib/diagrams/types';

const fixtures = path.join(__dirname, '..', 'fixtures', 'diagrams');
const good = listDiagrams(path.join(fixtures, 'content'))[0]!;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const codes = (scene: DiagramScene, labels: LabelsByLocale, opts = {}) =>
  new Set(checkDiagram(scene, labels, opts).errors.map((e) => e.code));
const withCode = (c: GateCode, scene: DiagramScene, labels: LabelsByLocale, opts = {}) => codes(scene, labels, opts).has(c);

describe('checkDiagram', () => {
  it('passes the toy fixture', () => {
    expect(checkDiagram(good.scene, good.labels).errors).toEqual([]);
  });

  it('KEY_MISSING / KEY_ORPHAN', () => {
    const l = clone(good.labels);
    delete l.vi!.labels.n2;
    expect(withCode('KEY_MISSING', good.scene, l)).toBe(true);
    const l2 = clone(good.labels);
    l2.en!.labels.extra = 'x';
    expect(withCode('KEY_ORPHAN', good.scene, l2)).toBe(true);
    expect(withCode('KEY_MISSING', good.scene, good.labels)).toBe(false);
    expect(withCode('KEY_ORPHAN', good.scene, good.labels)).toBe(false);
  });

  it('requires _title and _desc', () => {
    const l = clone(good.labels);
    delete l.zh!.labels._desc;
    expect(withCode('KEY_MISSING', good.scene, l)).toBe(true);
  });

  it('HAN_IN_LATIN', () => {
    const l = clone(good.labels);
    l.en!.labels.n2 = '事务 manager';
    expect(withCode('HAN_IN_LATIN', good.scene, l)).toBe(true);
    // Han inside a declared literal is allowed
    const s = clone(good.scene);
    s.nodes[1]!.label.literals = ['事务'];
    expect(withCode('HAN_IN_LATIN', s, l)).toBe(false);
    expect(withCode('HAN_IN_LATIN', good.scene, good.labels)).toBe(false);
  });

  it('LITERAL_MISSING', () => {
    const l = clone(good.labels);
    l.vi!.labels.n1 = 'Truy vấn productId=2';
    expect(withCode('LITERAL_MISSING', good.scene, l)).toBe(true);
    expect(withCode('LITERAL_MISSING', good.scene, good.labels)).toBe(false);
  });

  it('OVERFLOW (width, height, free text)', () => {
    const l = clone(good.labels);
    l.en!.labels.n3 = 'Supercalifragilisticexpialidocious';
    expect(withCode('OVERFLOW', good.scene, l)).toBe(true);
    const l2 = clone(good.labels);
    l2.en!.labels.n2 = 'a b c d e f g h i j k l m n o p q r s t u v w x y z a b c d e f';
    expect(withCode('OVERFLOW', good.scene, l2)).toBe(true);
    const l3 = clone(good.labels);
    l3.zh!.labels.t1 = '很'.repeat(40);
    expect(withCode('OVERFLOW', good.scene, l3)).toBe(true);
    expect(withCode('OVERFLOW', good.scene, good.labels)).toBe(false);
  });

  it('OUT_OF_VIEWBOX', () => {
    const s = clone(good.scene);
    s.nodes[2]!.x = 500;
    expect(withCode('OUT_OF_VIEWBOX', s, good.labels)).toBe(true);
    const s2 = clone(good.scene);
    s2.edges[0]!.points[1] = [600, 88];
    expect(withCode('OUT_OF_VIEWBOX', s2, good.labels)).toBe(true);
    expect(withCode('OUT_OF_VIEWBOX', good.scene, good.labels)).toBe(false);
  });

  it('NODE_OVERLAP (groups exempt, touching allowed)', () => {
    const s = clone(good.scene);
    s.nodes[1]!.x = 100;
    expect(withCode('NODE_OVERLAP', s, good.labels)).toBe(true);
    const touch = clone(good.scene);
    touch.nodes[1]!.x = 140;
    expect(withCode('NODE_OVERLAP', touch, good.labels)).toBe(false);
    const grp = clone(good.scene);
    grp.nodes[0]!.shape = 'group';
    grp.nodes[1]!.x = 100;
    expect(withCode('NODE_OVERLAP', grp, good.labels)).toBe(false);
  });

  it('HASH_STALE (zh-sourced and en-sourced)', () => {
    const l = clone(good.labels);
    l.en!.meta.from = 'deadbeef';
    expect(withCode('HASH_STALE', good.scene, l)).toBe(true);
    expect(withCode('HASH_STALE', good.scene, good.labels)).toBe(false);
    // topk-trie style: en is source, zh/vi derive from en
    const t = clone(good.labels);
    t.en!.meta = { locale: 'en', status: 'source', source_lang: 'en' };
    t.zh!.meta = { locale: 'zh', status: 'machine', source_lang: 'en', from: t.en!.sha256 };
    t.vi!.meta = { locale: 'vi', status: 'machine', source_lang: 'en', from: t.en!.sha256 };
    expect(withCode('HASH_STALE', good.scene, t)).toBe(false);
    t.vi!.meta.from = t.zh!.sha256;
    expect(withCode('HASH_STALE', good.scene, t)).toBe(true);
  });

  it('LICENSE_INVALID and default license', () => {
    const s = clone(good.scene);
    s.license = 'cc0';
    expect(withCode('LICENSE_INVALID', s, good.labels)).toBe(true);
    delete s.license;
    expect(withCode('LICENSE_INVALID', s, good.labels)).toBe(false);
    s.license = 'original';
    expect(withCode('LICENSE_INVALID', s, good.labels)).toBe(false);
  });

  it('SOURCE_MISSING', () => {
    expect(withCode('SOURCE_MISSING', good.scene, good.labels, { assetExists: () => false })).toBe(true);
    expect(withCode('SOURCE_MISSING', good.scene, good.labels, { assetExists: () => true })).toBe(false);
  });

  it('META_INVALID', () => {
    const l = clone(good.labels);
    l.vi!.meta.locale = 'en';
    expect(withCode('META_INVALID', good.scene, l)).toBe(true);
    const l2 = clone(good.labels);
    l2.en!.meta.status = 'draft';
    expect(withCode('META_INVALID', good.scene, l2)).toBe(true);
    const l3 = clone(good.labels);
    delete l3.vi;
    expect(withCode('META_INVALID', good.scene, l3)).toBe(true);
    expect(withCode('META_INVALID', good.scene, good.labels)).toBe(false);
  });
});

describe('runGate / check:diagrams CLI', () => {
  it('runGate reports zero errors for the good fixture and errors for the bad one', () => {
    const ok = runGate(path.join(fixtures, 'content'));
    expect(ok).toEqual([{ id: 'demo/toy/toy', errors: [] }]);
    const bad = runGate(path.join(fixtures, 'content-bad'));
    expect(bad[0]!.errors.map((e) => e.code)).toContain('HAN_IN_LATIN');
  });

  const run = (root: string) => {
    try {
      const out = execFileSync('node_modules/.bin/tsx', ['scripts/check-diagrams.ts'], {
        cwd: path.join(__dirname, '..', '..'),
        env: { ...process.env, CONTENT_ROOT: root },
        encoding: 'utf8',
      });
      return { status: 0, out };
    } catch (e) {
      const err = e as { status: number; stdout: string };
      return { status: err.status, out: err.stdout };
    }
  };

  it('exits 0 on the good fixture, non-zero on the bad one, 0 on an empty root', () => {
    expect(run(path.join(fixtures, 'content')).status).toBe(0);
    const bad = run(path.join(fixtures, 'content-bad'));
    expect(bad.status).not.toBe(0);
    expect(bad.out).toContain('HAN_IN_LATIN');
    const empty = run(path.join(fixtures));
    expect(empty.status).toBe(0);
  });
});
