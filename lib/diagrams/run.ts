import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { checkDiagram } from './gate';
import type { LoadedDiagram } from './load';
import type { GateError } from './types';

/** Gate one loaded diagram: load errors + gate errors, asset existence confined to the collection's `_assets`. */
export function gateLoaded(d: LoadedDiagram): GateError[] {
  const assetsDir = path.resolve(d.assetsDir);
  try {
    const { errors } = checkDiagram(d.scene, d.labels, {
      assetExists: (up) => {
        const p = path.resolve(assetsDir, up);
        if (!p.startsWith(assetsDir + path.sep)) return false;
        return existsSync(p) && statSync(p).isFile();
      },
    });
    return [...d.loadErrors, ...errors];
  } catch (e) {
    return [...d.loadErrors, { code: 'META_INVALID', message: `gate failed: ${(e as Error).message}` }];
  }
}
