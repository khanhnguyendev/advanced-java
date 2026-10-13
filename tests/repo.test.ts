import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('license split (spec §12)', () => {
  it('root LICENSE is MIT', () => {
    expect(existsSync('LICENSE')).toBe(true);
    expect(readFileSync('LICENSE', 'utf8')).toContain('MIT License');
  });

  it('content/LICENSE is CC-BY-SA-4.0', () => {
    expect(existsSync('content/LICENSE')).toBe(true);
    expect(readFileSync('content/LICENSE', 'utf8')).toContain('Attribution-ShareAlike 4.0 International');
  });

  it('package.json declares MIT', () => {
    expect(JSON.parse(readFileSync('package.json', 'utf8')).license).toBe('MIT');
  });
});
