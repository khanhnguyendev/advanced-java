import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export type HoldDecision = 'pending' | 'exclude' | 'translate';
export interface HoldEntry { reason: string; decision: HoldDecision }
export interface TranslationPolicy { hold: Record<string, HoldEntry> }

const DECISIONS: readonly string[] = ['pending', 'exclude', 'translate'];

export function loadPolicy(root: string, collection: string): TranslationPolicy {
  const file = path.join(root, collection, 'translation-policy.json');
  if (!existsSync(file)) return { hold: {} };
  const bad = (why: string) => new Error(`${file}: ${why}`);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw bad(`invalid JSON (${(e as Error).message})`);
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw bad('expected an object with a "hold" key');
  const hold = (raw as Record<string, unknown>).hold ?? {};
  if (typeof hold !== 'object' || hold === null || Array.isArray(hold)) throw bad('"hold" must be an object keyed by "<section>/<slug>"');
  const out: Record<string, HoldEntry> = {};
  for (const [key, v] of Object.entries(hold)) {
    if (typeof v !== 'object' || v === null) throw bad(`hold["${key}"] must be { reason, decision }`);
    const { reason, decision } = v as Record<string, unknown>;
    if (typeof reason !== 'string' || reason.trim() === '') throw bad(`hold["${key}"].reason must be a non-empty string`);
    if (typeof decision !== 'string' || !DECISIONS.includes(decision)) {
      throw bad(`hold["${key}"].decision must be one of ${DECISIONS.join(', ')} (got ${JSON.stringify(decision)})`);
    }
    out[key] = { reason, decision: decision as HoldDecision };
  }
  return { hold: out };
}

/** True when the doc is blocked from translation: held with decision 'pending' or 'exclude'. */
export function isHeld(policy: TranslationPolicy, section: string, slug: string): boolean {
  const e = policy.hold[`${section}/${slug}`];
  return e !== undefined && e.decision !== 'translate';
}
