import { readFileSync } from 'node:fs';
import { sanitizeSlug } from './slugs';

export interface ParsedItem { text: string; link?: string; items?: ParsedItem[] }

export const SECTION_PREFIXES: Record<string, string> = {
  'high-concurrency': 'HC',
  'distributed-system': 'DS',
  'high-availability': 'HA',
  'micro-services': 'MS',
  'big-data': 'BD',
};

export function loadSidebar(configPath: string): ParsedItem[] {
  let src = readFileSync(configPath, 'utf8');
  src = src.replace(/^\s*import[^;\n]*;?\s*$/gm, '');
  const idx = src.indexOf('export default');
  if (idx === -1) throw new Error(`no default export in ${configPath}`);
  src = src.slice(idx).replace(/^export default\s+defineConfig\(/, 'return (');
  const cfg = new Function(src)() as { themeConfig?: { sidebar?: ParsedItem[] } };
  const sidebar = cfg.themeConfig?.sidebar;
  if (!Array.isArray(sidebar)) throw new Error('themeConfig.sidebar is not an array');
  return sidebar;
}

export interface PlanGroup { id: string; title: string; lead?: string; docs: string[] }
export interface PlanSection { id: string; title: string; groups: PlanGroup[] }
export interface PlanDoc { slug: string; section: string; navTitle: string; upstreamFile: string }
export interface ImportPlan { sections: PlanSection[]; docs: Record<string, PlanDoc>; external: string[] }

const isExternal = (l: string) => /^https?:\/\//.test(l);

function toDoc(link: string, navTitle: string): PlanDoc {
  const m = /^\/([^/]+)\/(.+\.md)$/.exec(link);
  if (!m) throw new Error(`unexpected sidebar link ${link}`);
  return { slug: sanitizeSlug(m[2]), section: m[1], navTitle, upstreamFile: `docs/${m[1]}/${m[2]}` };
}

export function planFromSidebar(items: ParsedItem[]): ImportPlan {
  const plan: ImportPlan = { sections: [], docs: {}, external: [] };
  const add = (d: PlanDoc) => {
    if (plan.docs[d.slug]) throw new Error(`duplicate slug ${d.slug}`);
    plan.docs[d.slug] = d;
  };

  for (const top of items) {
    if (!top.items?.length) continue;
    const firstLink = findFirstLink(top);
    if (!firstLink) continue;
    const sectionId = toDoc(firstLink, '').section;
    const section: PlanSection = { id: sectionId, title: top.text, groups: [] };
    let gi = 0;
    let loose: PlanGroup | undefined;

    for (const child of top.items) {
      if (child.link && isExternal(child.link)) {
        plan.external.push(child.link);
        continue;
      }
      if (child.items?.length) {
        gi += 1;
        const docs: string[] = [];
        let lead: string | undefined;
        if (child.link) {
          const d = toDoc(child.link, child.text);
          add(d);
          docs.push(d.slug);
          lead = d.slug;
        }
        const collect = (item: ParsedItem) => {
          if (item.link) {
            if (isExternal(item.link)) plan.external.push(item.link);
            else {
              const d = toDoc(item.link, item.text);
              if (!plan.docs[d.slug]) {
                add(d);
                docs.push(d.slug);
              }
            }
          }
          for (const c of item.items ?? []) collect(c);
        };
        for (const leaf of child.items) collect(leaf);
        section.groups.push({ id: lead ?? `${sectionId}-g${gi}`, title: child.text, lead, docs });
      } else if (child.link) {
        const d = toDoc(child.link, child.text);
        add(d);
        if (!loose) {
          gi += 1;
          loose = { id: `${sectionId}-g${gi}`, title: top.text, docs: [] };
          section.groups.push(loose);
        }
        loose.docs.push(d.slug);
      }
    }
    plan.sections.push(section);
  }
  return plan;
}

function findFirstLink(item: ParsedItem): string | undefined {
  if (item.link && !isExternal(item.link)) return item.link;
  for (const c of item.items ?? []) {
    const l = findFirstLink(c);
    if (l) return l;
  }
  return undefined;
}

export function readmeOrder(readmeMd: string): { file: string; title: string }[] {
  const out: { file: string; title: string }[] = [];
  const re = /^\s*[-*]\s+\[([^\]]+)\]\(\/(docs\/[^)]+\.md)\)/gm;
  for (let m = re.exec(readmeMd); m; m = re.exec(readmeMd)) out.push({ file: m[2], title: m[1] });
  return out;
}

export function placeUnlisted(
  plan: ImportPlan,
  readme: { file: string; title: string }[],
  unlisted: string[],
): ImportPlan {
  const next: ImportPlan = JSON.parse(JSON.stringify(plan));
  const slugByFile = (f: string) => Object.values(next.docs).find((d) => d.upstreamFile === f)?.slug;

  for (const file of unlisted) {
    const at = readme.findIndex((r) => r.file === file);
    if (at === -1) throw new Error(`unlisted doc ${file} is not listed in the root README; cannot position it`);
    const m = /^docs\/([^/]+)\/(.+\.md)$/.exec(file)!;
    let predecessor: string | undefined;
    for (let i = at - 1; i >= 0 && !predecessor; i--) predecessor = slugByFile(readme[i].file);
    if (!predecessor) throw new Error(`no placed predecessor for ${file} in the root README`);
    const pred = next.docs[predecessor];
    if (pred.section !== m[1]) throw new Error(`predecessor of ${file} is in another section (${pred.section})`);
    const slug = sanitizeSlug(m[2]);
    const group = next.sections.flatMap((s) => s.groups).find((g) => g.docs.includes(predecessor!))!;
    group.docs.splice(group.docs.indexOf(predecessor) + 1, 0, slug);
    next.docs[slug] = { slug, section: m[1], navTitle: readme[at].title, upstreamFile: file };
  }
  return next;
}
