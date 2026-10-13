import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { LocaleMeta } from '../../lib/content/types';
import type { Glossary } from './prompt';

const LANG = { en: 'English', vi: 'Vietnamese' } as const;

export function buildMetaPrompt(i: { locale: 'en' | 'vi'; zhMeta: LocaleMeta; glossary: Glossary }): string {
  const gloss = Object.entries(i.glossary).map(([zh, t]) => `- ${zh} → ${t}`).join('\n');
  return `Translate the VALUES of this JSON from Chinese into ${LANG[i.locale]}. Return ONLY valid JSON with identical keys and the same structure. Keep product names (Kafka, Redis, Dubbo, Hystrix, ...) untranslated. Every value must be non-empty. Titles are interview-style questions; keep them natural and concise.

Glossary:
${gloss}

JSON:
${JSON.stringify(i.zhMeta, null, 2)}
`;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Sorted key paths of every node; "o" marks an object node, "l" a leaf. Order-independent. */
function paths(v: unknown, prefix = ''): string[] {
  if (!isObj(v)) return [`${prefix}:l`];
  const out = [`${prefix}:o`];
  for (const [k, child] of Object.entries(v)) out.push(...paths(child, `${prefix}${prefix ? '.' : ''}${JSON.stringify(k)}`));
  return out;
}

/** Rebuild an object from the zh key set, taking only leaf values from the translation. */
function rebuild(zh: unknown, tr: unknown): unknown {
  if (!isObj(zh)) {
    if (typeof tr !== 'string' || tr.trim() === '') throw new Error('translated meta has an empty or non-string value');
    return tr;
  }
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(zh)) out[k] = rebuild(zh[k], (tr as Record<string, unknown>)[k]);
  return out;
}

export function applyMeta(i: {
  root: string;
  collection: string;
  locale: 'en' | 'vi';
  translated: unknown;
}): { file: string } {
  const zh = JSON.parse(readFileSync(path.join(i.root, i.collection, 'zh', 'meta.json'), 'utf8')) as unknown;
  const a = paths(zh).sort().join('\n');
  const b = paths(i.translated).sort().join('\n');
  if (a !== b) throw new Error('translated meta must have identical keys to the zh meta');
  const t = rebuild(zh, i.translated);
  const file = path.join(i.root, i.collection, i.locale, 'meta.json');
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(t, null, 2) + '\n');
  return { file };
}
