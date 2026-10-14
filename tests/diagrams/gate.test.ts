import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '@/lib/diagrams/gate';
import { renderDiagram } from '@/lib/diagrams/render';
import { textMaxWidth, wrapText } from '@/lib/diagrams/measure';
import { listDiagrams } from '@/lib/diagrams/load';
import { runGate } from '@/scripts/check-diagrams';
import { gateLoaded } from '@/lib/diagrams/run';
import { buildReviewData } from '@/lib/diagrams/review-data';
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

describe('checkDiagram hardening', () => {
  it('rejects unknown keys at root, node, label ref, edge and text', () => {
    const unknown = (mut: (s: any) => void) => {
      const s = clone(good.scene) as any;
      mut(s);
      return checkDiagram(s, good.labels).errors.filter((e) => e.code === 'META_INVALID').map((e) => e.message);
    };
    expect(unknown((s) => (s.literals = ['x'])).some((m) => m.includes('"literals"') && m.includes('scene'))).toBe(true);
    expect(unknown((s) => (s.nodes[0].colour = 'red')).some((m) => m.includes('"colour"') && m.includes('node'))).toBe(true);
    expect(unknown((s) => (s.nodes[0].label.extra = 1)).some((m) => m.includes('"extra"'))).toBe(true);
    expect(unknown((s) => s.edges.length && (s.edges[0].weight = 1)).some((m) => m.includes('"weight"')) || good.scene.edges.length === 0).toBe(true);
    expect(unknown((s) => s.texts.length && (s.texts[0].font = 1)).some((m) => m.includes('"font"')) || good.scene.texts.length === 0).toBe(true);
  });

  const metaMsgs = (scene: DiagramScene, labels: LabelsByLocale) =>
    checkDiagram(scene, labels).errors.filter((e) => e.code === 'META_INVALID').map((e) => e.message);

  it('rejects empty or whitespace-only translations', () => {
    const l = clone(good.labels);
    l.vi!.labels.n2 = '   ';
    const errs = checkDiagram(good.scene, l).errors;
    expect(errs.some((e) => e.code === 'KEY_MISSING' && e.locale === 'vi' && e.message.includes('empty'))).toBe(true);
    const l2 = clone(good.labels);
    l2.en!.labels.n2 = '';
    expect(withCode('KEY_MISSING', good.scene, l2)).toBe(true);
  });

  it('does not treat prototype names as present keys', () => {
    const s = clone(good.scene);
    s.nodes[0]!.label.key = 'toString';
    const l = clone(good.labels);
    expect(withCode('KEY_MISSING', s, l)).toBe(true);
  });

  it('flags attribute injection via anchor and via x', () => {
    const s = clone(good.scene);
    (s.texts[0] as { anchor: string }).anchor = 'middle" onload="x';
    expect(metaMsgs(s, good.labels).some((m) => m.includes('anchor'))).toBe(true);
    const s2 = clone(good.scene);
    (s2.nodes[0] as { x: unknown }).x = '0" onclick="x';
    expect(metaMsgs(s2, good.labels).some((m) => m.includes(' x '))).toBe(true);
    const s3 = clone(good.scene);
    s3.edges[0]!.points[0] = [Number.NaN, 1];
    expect(metaMsgs(s3, good.labels).length).toBeGreaterThan(0);
  });

  it('flags a typo in shape/role/arrow/style and non-positive sizes', () => {
    const s = clone(good.scene);
    (s.nodes[0] as { shape: string }).shape = 'boxx';
    expect(metaMsgs(s, good.labels).some((m) => m.includes('shape'))).toBe(true);
    const s2 = clone(good.scene);
    (s2.nodes[0] as { role: string }).role = 'loud';
    expect(metaMsgs(s2, good.labels).some((m) => m.includes('role'))).toBe(true);
    const s3 = clone(good.scene);
    (s3.edges[0] as { arrow: string }).arrow = 'bot';
    (s3.edges[0] as { style: string }).style = 'dotted';
    const m3 = metaMsgs(s3, good.labels);
    expect(m3.some((m) => m.includes('arrow'))).toBe(true);
    expect(m3.some((m) => m.includes('style'))).toBe(true);
    const s4 = clone(good.scene);
    s4.nodes[0]!.w = 0;
    s4.size.h = -1;
    const m4 = metaMsgs(s4, good.labels);
    expect(m4.some((m) => m.includes(' w '))).toBe(true);
    expect(m4.some((m) => m.includes('size.h'))).toBe(true);
  });

  it('requires status source on the reference and machine on the others; consistent source_lang', () => {
    const l = clone(good.labels);
    l.zh!.meta.status = 'machine';
    expect(withCode('META_INVALID', good.scene, l)).toBe(true);
    const l2 = clone(good.labels);
    l2.vi!.meta.status = 'source';
    expect(withCode('META_INVALID', good.scene, l2)).toBe(true);
    const l3 = clone(good.labels);
    l3.vi!.meta.source_lang = 'en';
    l3.en!.meta.source_lang = 'zh';
    expect(metaMsgs(good.scene, l3).some((m) => m.includes('source_lang'))).toBe(true);
  });

  it('checks the whole multi-line free-text block and group label height', () => {
    const s = clone(good.scene);
    s.texts[0]!.y = s.size.h - 8;
    const l = clone(good.labels);
    l.en!.labels[s.texts[0]!.key] = 'a\nb\nc';
    expect(withCode('OVERFLOW', s, l)).toBe(true);
    const g2 = clone(good.scene);
    g2.nodes[0]!.shape = 'group';
    g2.nodes[0]!.h = 20;
    expect(withCode('OVERFLOW', g2, good.labels)).toBe(true);
  });

  it('requires an edge to have at least 2 points', () => {
    const s = clone(good.scene);
    s.edges[0]!.points = [[10, 10]];
    expect(metaMsgs(s, good.labels).some((m) => m.includes('at least 2 points'))).toBe(true);
  });

  it('requires title_key _title and desc_key _desc', () => {
    const s = clone(good.scene);
    s.title_key = 'n1';
    expect(metaMsgs(s, good.labels).some((m) => m.includes('title_key'))).toBe(true);
    const s2 = clone(good.scene);
    s2.desc_key = 'n1';
    expect(metaMsgs(s2, good.labels).some((m) => m.includes('desc_key'))).toBe(true);
  });

  it('validates the group border enum', () => {
    const s = clone(good.scene);
    (s.nodes[0] as { border: string }).border = 'wavy';
    expect(metaMsgs(s, good.labels).some((m) => m.includes('border'))).toBe(true);
    (s.nodes[0] as { border: string }).border = 'solid';
    expect(metaMsgs(s, good.labels).some((m) => m.includes('border'))).toBe(false);
  });

  it('uses the inscribed square for circle text', () => {
    const s = clone(good.scene);
    const n = s.nodes[1]!;
    n.w = 90;
    n.h = 90;
    n.shape = 'box';
    const l = clone(good.labels);
    l.en!.labels[n.label.key] = 'abcdefghi';
    expect(withCode('OVERFLOW', s, l)).toBe(false);
    n.shape = 'circle';
    expect(withCode('OVERFLOW', s, l)).toBe(true);
  });
});

describe('gate robustness and wrap parity', () => {
  const metaCodes = (scene: DiagramScene, labels: LabelsByLocale) => {
    const r = checkDiagram(scene, labels).errors;
    return r.filter((e) => e.code === 'META_INVALID');
  };

  it('circle: gate and renderer wrap at the same width and the gate reports OVERFLOW', () => {
    const s = clone(good.scene);
    const n = s.nodes[1]!;
    n.shape = 'circle';
    n.w = 120;
    n.h = 120;
    const l = clone(good.labels);
    const text = '数'.repeat(40);
    l.zh!.labels[n.label.key] = text;
    const svg = renderDiagram(s, l.zh!.labels, 'zh');
    const g = svg.split(`<g data-node="${n.id}"`)[1]!.split('</g>')[0]!;
    const drawn = [...g.matchAll(/<text [^>]*>(.*?)<\/text>/g)].map((m) => m[1]!.replace(/<[^>]+>/g, ''));
    const gateLines = wrapText(text, [], textMaxWidth(n)).map((ln) => ln.segs.map((x) => x.text).join(''));
    expect(textMaxWidth(n)).toBeCloseTo(120 * Math.SQRT1_2);
    expect(drawn).toEqual(gateLines);
    const overflow = checkDiagram(s, l).errors.filter((e) => e.code === 'OVERFLOW');
    expect(overflow.some((e) => e.message.includes('> 84.9'))).toBe(true);
  });

  it('textMaxWidth for non-circles is w - 16', () => {
    expect(textMaxWidth({ shape: 'box', w: 100 })).toBe(84);
  });

  it('returns META_INVALID without throwing for malformed scenes', () => {
    const a = clone(good.scene);
    (a.edges[0] as { points: unknown }).points = 'nope';
    expect(metaCodes(a, good.labels).length).toBeGreaterThan(0);

    const b = clone(good.scene);
    (b.edges[0] as { label: unknown }).label = { key: 'n1', anchor: 'start' };
    expect(metaCodes(b, good.labels).length).toBeGreaterThan(0);

    const c = clone(good.labels);
    (c.en!.labels as Record<string, unknown>).n1 = 5;
    expect(metaCodes(good.scene, c).length).toBeGreaterThan(0);

    const d = clone(good.scene);
    delete (d.nodes[0] as { label?: unknown }).label;
    expect(metaCodes(d, good.labels).length).toBeGreaterThan(0);

    const e = clone(good.scene);
    (e as { nodes: unknown }).nodes = 'x';
    expect(metaCodes(e, good.labels).length).toBeGreaterThan(0);
  });

  it('flags a blank title or desc in every locale, including the reference', () => {
    const l = clone(good.labels);
    l.zh!.labels._title = '  ';
    const errs = checkDiagram(good.scene, l).errors;
    expect(errs.some((e) => e.code === 'KEY_MISSING' && e.locale === 'zh' && e.message.includes('_title'))).toBe(true);
    const l2 = clone(good.labels);
    l2.vi!.labels._desc = '';
    expect(checkDiagram(good.scene, l2).errors.some((e) => e.locale === 'vi' && e.message.includes('_desc'))).toBe(true);
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

describe('broken scene files', () => {
  const broken = path.join(fixtures, 'content-broken');

  it('listDiagrams does not throw and runGate reports META_INVALID', () => {
    const list = listDiagrams(broken);
    expect(list.map((d) => d.id)).toEqual(['x/invalid', 'x/null', 'x/empty']);
    const res = runGate(broken);
    expect(res).toHaveLength(3);
    for (const r of res) expect(r.errors.some((e) => e.code === 'META_INVALID')).toBe(true);
  });

  it('buildReviewData survives them', () => {
    const d = buildReviewData(broken, '2026-10-14');
    expect(d.count).toBe(3);
    for (const e of d.entries) expect(e.errors.some((x) => x.code === 'META_INVALID')).toBe(true);
  });

  it('a scene without a string id reports META_INVALID and uses the path as id', () => {
    const list = listDiagrams(broken);
    const empty = list.find((d) => d.file.endsWith('empty.diagram.json'))!;
    expect(empty.id).toBe('x/empty');
    expect(empty.loadErrors.some((e) => e.code === 'META_INVALID' && e.message.includes('id is not a non-empty string'))).toBe(true);
    const r = runGate(broken).find((x) => x.id === empty.id)!;
    expect(r.errors.some((e) => e.message.includes('id is not a non-empty string'))).toBe(true);
    expect(checkDiagram({ id: 5 } as unknown as DiagramScene, {}).errors.some((e) => e.message.includes('id is not a non-empty string'))).toBe(true);
  });

  it('parse failure message includes the cause and no follow-on gate noise', () => {
    const inv = listDiagrams(broken).find((d) => d.file.endsWith('invalid.diagram.json'))!;
    expect(inv.loadErrors[0]!.message).toMatch(/^cannot parse a\/_diagrams\/x\/invalid\.diagram\.json: .+/);
    expect(inv.id).toBe('x/invalid');
    expect(gateLoaded(inv)).toEqual(inv.loadErrors);
  });
});

describe('gateLoaded', () => {
  it('rejects source.upstream escaping _assets', () => {
    const d = clone(good);
    d.scene.source.upstream = '../_diagrams/demo/toy/toy.diagram.json';
    expect(gateLoaded(d).some((e) => e.code === 'SOURCE_MISSING')).toBe(true);
    expect(gateLoaded(good)).toEqual([]);
  });

  it('rejects an absolute source.upstream pointing at an existing file', () => {
    const d = clone(good);
    d.scene.source.upstream = good.file;
    expect(gateLoaded(d).some((e) => e.code === 'SOURCE_MISSING')).toBe(true);
  });

  it('rejects a symlink inside _assets that points outside', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'diag-'));
    try {
      const assets = path.join(tmp, 'c', '_assets');
      mkdirSync(assets, { recursive: true });
      try {
        symlinkSync(good.file, path.join(assets, 'link.json'));
      } catch {
        return; // no symlink support
      }
      const d = clone(good);
      d.assetsDir = assets;
      d.scene.source.upstream = 'link.json';
      expect(gateLoaded(d).some((e) => e.code === 'SOURCE_MISSING')).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('a bad label file does not suppress other locales checks', () => {
    const d = clone(good);
    (d.labels.vi!.labels as Record<string, unknown>).n1 = 5;
    delete d.labels.en!.labels.n2;
    const errs = gateLoaded(d);
    expect(errs.some((e) => e.code === 'META_INVALID' && e.locale === 'vi')).toBe(true);
    expect(errs.some((e) => e.code === 'KEY_MISSING' && e.locale === 'en')).toBe(true);
  });
});
