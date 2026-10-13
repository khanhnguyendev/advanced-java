import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { copyAssets } from '../../scripts/copy-assets';

describe('copyAssets', () => {
  it('copies _assets of every collection to public/_content', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ca-'));
    const content = path.join(root, 'content');
    const pub = path.join(root, 'public');
    mkdirSync(path.join(content, 'demo/_assets/alpha/why'), { recursive: true });
    writeFileSync(path.join(content, 'demo/_assets/alpha/why/d.png'), 'png');
    mkdirSync(path.join(content, 'demo/zh/alpha'), { recursive: true });
    writeFileSync(path.join(content, 'demo/zh/alpha/why.md'), '# x');
    expect(copyAssets(content, pub)).toBe(1);
    expect(readFileSync(path.join(pub, '_content/demo/alpha/why/d.png'), 'utf8')).toBe('png');
    expect(existsSync(path.join(pub, '_content/demo/zh'))).toBe(false);
  });
  it('returns 0 when there is no content yet', () => {
    expect(copyAssets('/nonexistent-content', '/tmp/ignored-public')).toBe(0);
  });
});
