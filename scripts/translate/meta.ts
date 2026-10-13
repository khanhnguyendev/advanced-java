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

function shape(m: LocaleMeta): string[] {
  const k: string[] = [];
  for (const [a, v] of Object.entries(m.sections)) k.push(`sections.${a}`, typeof v);
  for (const [a, v] of Object.entries(m.groups)) k.push(`groups.${a}`, typeof v);
  for (const [a, v] of Object.entries(m.docs)) k.push(`docs.${a}.title`, typeof v.title, `docs.${a}.navTitle`, typeof v.navTitle);
  return k;
}

export function applyMeta(i: {
  root: string;
  collection: string;
  locale: 'en' | 'vi';
  translated: unknown;
}): { file: string } {
  const zh = JSON.parse(readFileSync(path.join(i.root, i.collection, 'zh', 'meta.json'), 'utf8')) as LocaleMeta;
  const t = i.translated as LocaleMeta;
  if (typeof t !== 'object' || t === null || !t.sections || !t.groups || !t.docs) {
    throw new Error('translated meta must have identical keys to the zh meta');
  }
  if (shape(zh).join('|') !== shape(t).join('|')) throw new Error('translated meta must have identical keys to the zh meta');
  const values = [
    ...Object.values(t.sections),
    ...Object.values(t.groups),
    ...Object.values(t.docs).flatMap((d) => [d.title, d.navTitle]),
  ];
  if (values.some((v) => typeof v !== 'string' || v.trim() === '')) throw new Error('translated meta has an empty value');
  const file = path.join(i.root, i.collection, i.locale, 'meta.json');
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(t, null, 2) + '\n');
  return { file };
}
