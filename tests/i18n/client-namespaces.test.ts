import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CLIENT_NAMESPACES } from '@/i18n/client-namespaces';

const ROOT = path.join(__dirname, '..', '..');
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = path.join(d, f);
    if (f === 'node_modules' || f.startsWith('.')) return [];
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : [];
  });

const isClient = (src: string) => /^(\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/))*\s*['"]use client['"]/.test(src);

/** Relative or '@/' import specifiers in a source string. */
const localImports = (src: string): string[] =>
  Array.from(src.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]((?:\.{1,2}\/|@\/)[^'"]+)['"]/g), (m) => m[1]!);

function resolveImport(from: string, spec: string): string | null {
  const base = spec.startsWith('@/') ? path.join(ROOT, spec.slice(2)) : path.resolve(path.dirname(from), spec);
  for (const c of [base, base.replace(/\.js$/, '.ts'), base.replace(/\.js$/, '.tsx'), `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

/** Pure checker: returns a list of problems found in one client source string. */
export function checkClientSource(src: string, allowed: readonly string[]): string[] {
  const problems: string[] = [];
  if (/\buseTranslations\s+as\b/.test(src)) problems.push('aliased useTranslations import');
  for (const m of src.matchAll(/\buseTranslations\s*\(([^)]*)\)/g)) {
    const arg = m[1]!.trim();
    if (arg === '') {
      problems.push('bare useTranslations()');
      continue;
    }
    const lit = /^(['"])([^'"`$\\]+)\1$/.exec(arg);
    if (!lit) {
      problems.push(`non-literal useTranslations argument: ${arg}`);
      continue;
    }
    const root = lit[2]!.split('.')[0]!;
    if (!allowed.includes(root)) problems.push(`unlisted namespace: ${lit[2]}`);
  }
  return problems;
}

describe('checkClientSource (self-test, so the scan is not vacuous)', () => {
  const ok = ['nav', 'doc'];
  it('accepts listed literals and the import statement', () => {
    expect(checkClientSource(`import { useTranslations } from 'next-intl';\nconst t = useTranslations('nav');`, ok)).toEqual([]);
    expect(checkClientSource(`const t = useTranslations("doc.sub");`, ok)).toEqual([]);
  });
  it('detects bare useTranslations()', () => {
    expect(checkClientSource(`const t = useTranslations();`, ok)).toEqual(['bare useTranslations()']);
  });
  it('detects non-literal arguments', () => {
    expect(checkClientSource(`const t = useTranslations(ns);`, ok)).toHaveLength(1);
    expect(checkClientSource('const t = useTranslations(`nav`);', ok)).toHaveLength(1);
    expect(checkClientSource('const t = useTranslations(`${x}`);', ok)).toHaveLength(1);
  });
  it('detects an aliased import', () => {
    expect(checkClientSource(`import { useTranslations as useT } from 'next-intl';`, ok)).toEqual(['aliased useTranslations import']);
  });
  it('detects an unlisted literal namespace', () => {
    expect(checkClientSource(`const t = useTranslations('secret');`, ok)).toEqual(['unlisted namespace: secret']);
  });
  it('detects client files by directive, and imports one level from them', () => {
    expect(isClient(`'use client';\nimport x from './x';`)).toBe(true);
    expect(isClient(`import x from './x';`)).toBe(false);
    expect(localImports(`import a from './a';\nimport b from '@/lib/b';\nimport c from 'react';`)).toEqual(['./a', '@/lib/b']);
  });
});

describe('client message namespaces', () => {
  const files = ['app', 'components', 'lib', 'i18n'].flatMap((d) => walk(path.join(ROOT, d)));
  const srcOf = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));
  const direct = files.filter((f) => isClient(srcOf.get(f)!));
  const clientSet = new Set(direct);
  for (const f of direct) {
    for (const spec of localImports(srcOf.get(f)!)) {
      const r = resolveImport(f, spec);
      if (r && srcOf.has(r)) clientSet.add(r);
    }
  }
  it('finds client components', () => {
    expect(direct.length).toBeGreaterThan(0);
    expect(clientSet.size).toBeGreaterThanOrEqual(direct.length);
  });
  it('every useTranslations in a client file is a listed string literal', () => {
    const failures = Array.from(clientSet).flatMap((f) =>
      checkClientSource(srcOf.get(f)!, CLIENT_NAMESPACES).map((p) => `${path.relative(ROOT, f)}: ${p}`),
    );
    expect(failures).toEqual([]);
  });
});
