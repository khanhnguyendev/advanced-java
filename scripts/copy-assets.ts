import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

function countFiles(dir: string): number {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    n += statSync(p).isDirectory() ? countFiles(p) : 1;
  }
  return n;
}

export function copyAssets(contentRoot: string, publicRoot: string): number {
  if (!existsSync(contentRoot)) return 0;
  let copied = 0;
  for (const collection of readdirSync(contentRoot)) {
    const assets = path.join(contentRoot, collection, '_assets');
    if (!existsSync(assets) || !statSync(assets).isDirectory()) continue;
    const dest = path.join(publicRoot, '_content', collection);
    mkdirSync(dest, { recursive: true });
    cpSync(assets, dest, { recursive: true });
    copied += countFiles(assets);
  }
  return copied;
}

if (path.basename(process.argv[1] ?? '') === 'copy-assets.ts') {
  const n = copyAssets(path.join(process.cwd(), 'content'), path.join(process.cwd(), 'public'));
  console.log(`copied ${n} asset file(s) to public/_content`);
}
