import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { LOCALES } from './types';

export type HoldDecision = 'pending' | 'exclude' | 'translate';
export interface HoldEntry { reason: string; decision: HoldDecision; excludeLocales?: string[] }
export interface TranslationPolicy { hold: Record<string, HoldEntry> }

const DECISIONS: readonly string[] = ['pending', 'exclude', 'translate'];
// The corpus source locale is zh; it can never be excluded, so only the translated locales are valid.
const SOURCE_LOCALE = 'zh';
const TARGET_LOCALES: readonly string[] = LOCALES.filter((l) => l !== SOURCE_LOCALE);

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
    const { excludeLocales } = v as Record<string, unknown>;
    if (excludeLocales !== undefined) {
      if (!Array.isArray(excludeLocales) || excludeLocales.some((x) => typeof x !== 'string' || x === '')) {
        throw bad(`hold["${key}"].excludeLocales must be an array of non-empty locale strings`);
      }
      if (decision !== 'translate') throw bad(`hold["${key}"].excludeLocales is only valid with decision "translate"`);
      for (const l of excludeLocales as string[]) {
        if (l === SOURCE_LOCALE) throw bad(`hold["${key}"].excludeLocales must not include the source locale ${SOURCE_LOCALE}`);
        if (!TARGET_LOCALES.includes(l)) {
          throw bad(`hold["${key}"].excludeLocales: unknown locale ${JSON.stringify(l)} (expected one of ${TARGET_LOCALES.join(', ')})`);
        }
      }
      out[key] = { reason, decision: decision as HoldDecision, excludeLocales: excludeLocales as string[] };
    } else out[key] = { reason, decision: decision as HoldDecision };
  }
  return { hold: out };
}

/**
 * True when the doc is blocked from translation: held with decision 'pending' or 'exclude', or,
 * when a locale is given, listed in the entry's excludeLocales for that locale.
 */
export function isHeld(policy: TranslationPolicy, section: string, slug: string, locale?: string): boolean {
  const e = policy.hold[`${section}/${slug}`];
  if (e === undefined) return false;
  if (e.decision !== 'translate') return true;
  return locale !== undefined && (e.excludeLocales ?? []).includes(locale);
}

/** Error text for a blocked doc, or undefined when the doc is not blocked. */
export function heldMessage(policy: TranslationPolicy, section: string, slug: string, locale?: string): string | undefined {
  if (!isHeld(policy, section, slug, locale)) return undefined;
  const e = policy.hold[`${section}/${slug}`];
  if (e.decision === 'translate') return `doc is held for locale ${locale} by translation-policy.json (excludeLocales: ${(e.excludeLocales ?? []).join(', ')})`;
  return `doc is held by translation-policy.json (decision: ${e.decision})`;
}
