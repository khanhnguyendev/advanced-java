/** True when a non-zh page renders zh-Hans content or title, so the async Noto Serif SC chunk is needed. */
export function needsCjkFont(loc: string, contentLang?: string, titleLang?: string): boolean {
  return loc !== 'zh' && (contentLang === 'zh-Hans' || titleLang === 'zh-Hans');
}
