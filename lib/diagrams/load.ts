import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { DiagramScene, GateError, LabelsByLocale, LabelsFile } from './types';
import { DIAGRAM_LOCALES } from './types';

export interface LoadedDiagram {
  id: string;
  file: string;
  collection: string;
  /** `<root>/<collection>/_assets` */
  assetsDir: string;
  scene: DiagramScene;
  labels: LabelsByLocale;
  /** problems found while reading (unparseable JSON etc.), reported as META_INVALID */
  loadErrors: GateError[];
}

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.diagram.json')) out.push(p);
  }
}

export function loadDiagram(file: string, collection: string, root: string): LoadedDiagram {
  const loadErrors: GateError[] = [];
  let scene: DiagramScene;
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('not an object');
    scene = parsed as DiagramScene;
  } catch {
    const rel = path.relative(root, file).split(path.sep).join('/');
    return {
      id: rel,
      file,
      collection,
      assetsDir: path.join(root, collection, '_assets'),
      scene: { nodes: [], edges: [], texts: [] } as unknown as DiagramScene,
      labels: {},
      loadErrors: [{ code: 'META_INVALID', message: `cannot parse ${rel}` }],
    };
  }
  const base = file.slice(0, -'.diagram.json'.length);
  const labels: LabelsByLocale = {};
  for (const loc of DIAGRAM_LOCALES) {
    const lf = `${base}.labels.${loc}.json`;
    if (!existsSync(lf)) continue;
    const bytes = readFileSync(lf);
    try {
      const parsed = JSON.parse(bytes.toString('utf8')) as LabelsFile;
      labels[loc] = {
        meta: parsed.meta,
        labels: parsed.labels,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      };
    } catch (e) {
      loadErrors.push({ code: 'META_INVALID', message: `cannot parse ${path.basename(lf)}: ${(e as Error).message}`, locale: loc });
    }
  }
  return { id: scene.id, file, collection, assetsDir: path.join(root, collection, '_assets'), scene, labels, loadErrors };
}

/** Every `*.diagram.json` under `<root>/*\/_diagrams`, sorted. */
export function listDiagrams(root: string): LoadedDiagram[] {
  if (!existsSync(root)) return [];
  const out: LoadedDiagram[] = [];
  for (const collection of readdirSync(root).sort()) {
    const dir = path.join(root, collection, '_diagrams');
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    const files: string[] = [];
    walk(dir, files);
    for (const f of files) out.push(loadDiagram(f, collection, root));
  }
  return out;
}
