import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { contentRoot, loadCollection } from '@/lib/content/collection';
import { collectionStats, countStatuses, sectionStats } from '@/lib/stats';

const root = path.resolve(__dirname, '../fixtures/content');

describe('collectionStats', () => {
  it('counts real files per locale, not fallbacks', () => {
    const s = collectionStats(root, loadCollection(root, 'demo'));
    expect(s).toEqual({ collection: 'demo', total: 3, perLocale: { en: 1, vi: 0, zh: 3 } });
  });
});

describe('countStatuses', () => {
  it('splits translated, machine and fallback', () => {
    expect(countStatuses(['translated', 'machine', 'fallback', 'machine'])).toEqual({
      total: 4,
      translated: 1,
      machine: 2,
      fallback: 1,
    });
  });
});

describe('sectionStats', () => {
  it('uses the switcher semantics per section and locale', () => {
    const s = sectionStats(root, loadCollection(root, 'demo'));
    expect(s).toHaveLength(1);
    expect(s[0].id).toBe('alpha');
    expect(s[0].total).toBe(3);
    // zh is the source locale: every doc is translated there
    expect(s[0].perLocale.zh).toEqual({ total: 3, translated: 3, machine: 0, fallback: 0 });
    expect(s[0].perLocale.vi.fallback).toBe(3);
  });
});

describe('sectionStats on the real content', () => {
  it('derives the machine/fallback split from the files on disk', () => {
    const real = contentRoot();
    const c = loadCollection(real, 'advanced-java');
    const s = sectionStats(real, c);
    const mdFiles = (l: string, section: string) => {
      const dir = path.join(real, 'advanced-java', l, section);
      return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')) : [];
    };
    let enMachine = 0;
    for (const x of s) {
      for (const l of ['en', 'vi'] as const) {
        let machine = 0;
        let translated = 0;
        for (const f of mdFiles(l, x.id)) {
          const fm = matter(readFileSync(path.join(real, 'advanced-java', l, x.id, f), 'utf8')).data;
          if (fm.status === 'reviewed') translated += 1;
          else machine += 1;
        }
        const got = x.perLocale[l];
        expect(got.machine, `${l}/${x.id} machine`).toBe(machine);
        expect(got.translated, `${l}/${x.id} translated`).toBe(translated);
        expect(got.fallback, `${l}/${x.id} fallback`).toBe(x.total - machine - translated);
        expect(got.translated + got.machine + got.fallback).toBe(got.total);
        expect(got.total).toBe(x.total);
        if (l === 'en') enMachine += got.machine + got.translated;
      }
      const zh = x.perLocale.zh;
      expect(zh.translated).toBe(x.total);
      expect(zh.machine + zh.fallback).toBe(0);
    }
    expect(enMachine, 'en is not all fallback').toBeGreaterThan(0);
  });
});
