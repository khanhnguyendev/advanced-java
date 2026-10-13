import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { contentRoot, docFile, listDocs, loadCollection, loadMeta } from '../../lib/content/collection';
import { parse } from '../../lib/content/fallback';
import { pendingBatches } from './batches';
import { applyMeta, buildMetaPrompt } from './meta';
import { buildPrompt, type Glossary } from './prompt';
import { stampTranslation } from './stamp';

const KEEP = [
  'Kafka', 'ActiveMQ', 'RabbitMQ', 'RocketMQ', 'Redis', 'Elasticsearch', 'ES', 'Lucene', 'Dubbo', 'ZooKeeper',
  'Hystrix', 'Sentinel', 'Spring Cloud', 'Spring Boot', 'MySQL', 'Nginx', 'JVM', 'Netty', 'Docker', 'Kubernetes',
];

const localToday = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const [cmd, ...rest] = process.argv.slice(2);
const opt = (name: string): string => {
  const at = rest.indexOf(`--${name}`);
  return at === -1 ? '' : (rest[at + 1] ?? '');
};
const need = (name: string): string => {
  const v = opt(name);
  if (!v) throw new Error(`missing --${name}`);
  return v;
};
const root = contentRoot();
const collection = opt('collection') || 'advanced-java';
const localeArg = opt('locale');
const locale = (['en', 'vi'].includes(localeArg) ? localeArg : undefined) as 'en' | 'vi' | undefined;
const needLocale = (): 'en' | 'vi' => {
  if (!locale) throw new Error('--locale must be en or vi');
  return locale;
};
const glossary = (): Glossary =>
  JSON.parse(readFileSync(path.join(root, collection, `glossary.${needLocale()}.json`), 'utf8'));
const findDoc = (slug: string) => {
  const c = loadCollection(root, collection);
  const d = listDocs(c).find((x) => x.slug === slug);
  if (!d) throw new Error(`unknown slug ${slug}`);
  return { c, d };
};

if (cmd === 'prompt') {
  const slug = need('slug');
  const l = needLocale();
  const { c, d } = findDoc(slug);
  const zhBody = parse(readFileSync(docFile(root, collection, c.sourceLocale, d.section, slug), 'utf8')).content;
  const out = path.join('.translation', 'prompts', l, `${slug}.md`);
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, buildPrompt({ locale: l, slug, zhBody, glossary: glossary(), keep: KEEP }));
  console.log(out);
} else if (cmd === 'stamp') {
  const slug = need('slug');
  const { d } = findDoc(slug);
  const translatedBody = readFileSync(need('file'), 'utf8');
  const r = stampTranslation({
    root, collection, locale: needLocale(), section: d.section, slug, translatedBody,
    today: localToday(),
  });
  for (const i of r.issues) console.log(`${i.level} [${i.code}] ${i.message}`);
  for (const w of r.waived) console.log(`waived [${w.code}] (${w.reason})`);
  console.log(r.written ? `written ${r.file}` : 'REJECTED, not written');
  process.exit(r.written ? 0 : 1);
} else if (cmd === 'meta-prompt') {
  const l = needLocale();
  const c = loadCollection(root, collection);
  const out = path.join('.translation', 'prompts', l, 'meta.md');
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, buildMetaPrompt({ locale: l, zhMeta: loadMeta(root, collection, c.sourceLocale), glossary: glossary() }));
  console.log(out);
} else if (cmd === 'meta-apply') {
  const translated = JSON.parse(readFileSync(need('file'), 'utf8'));
  console.log(applyMeta({ root, collection, locale: needLocale(), translated }).file);
} else if (cmd === 'batches') {
  const size = Number(opt('size') || '10');
  for (const b of pendingBatches(root, collection, needLocale(), size)) console.log(`${b.section}: ${b.slugs.join(' ')}`);
} else {
  console.error('usage: translate <prompt|stamp|meta-prompt|meta-apply|batches> --locale en|vi [--slug s] [--file f] [--size n]');
  process.exit(2);
}
