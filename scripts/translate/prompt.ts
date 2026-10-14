export type Glossary = Record<string, string>;

const LANG = { en: 'English', vi: 'Vietnamese' } as const;

/** The exact H1 for a doc, from the locale meta; throws when the titles tier has not run. */
export function requireTitle(meta: { docs: Record<string, { title?: string }> }, slug: string, locale: string): string {
  const t = meta.docs[slug]?.title;
  if (!t || t.trim() === '') {
    throw new Error(`no ${locale} title for ${slug} in meta.json: run the titles tier first (meta-prompt / meta-apply)`);
  }
  return t;
}

export function buildPrompt(i: {
  locale: 'en' | 'vi';
  slug: string;
  title: string;
  zhBody: string;
  glossary: Glossary;
  keep: string[];
}): string {
  const lang = LANG[i.locale];
  const gloss = Object.entries(i.glossary).map(([zh, t]) => `- ${zh} → ${t}`).join('\n');
  const viRules =
    i.locale === 'vi'
      ? `13. Vietnamese only: write numbers in Vietnamese units (nghìn, triệu, tỷ), never 万, w or vạn. 万 = chục nghìn (10,000); 十万 = trăm nghìn (100,000); 百万 = triệu (1,000,000); 千万 = chục triệu; 亿 = trăm triệu (100,000,000); 十亿 = tỷ (1,000,000,000). Check every figure: the translated number must have the same value as the source.
14. Vietnamese only: write 临时耦合 as the glossary says, and translate technical terms for a Vietnamese engineer audience; keep established English terms (circuit breaker, thread pool, ...) per the glossary.
`
      : '';
  return `You are translating one technical document (slug: ${i.slug}) into ${lang}.

Translate directly from the Chinese source below. Do not use any other translation as a source.

Rules 1-7 are checked by an automated gate; a violation rejects the file. Rules 8-15 are guidance:
1. Output ONLY the translated markdown body. No frontmatter, no commentary, no surrounding code fence.
2. Keep exactly the same number of headings and the same heading levels (# / ## / ### …), in the same order. The document's first heading \`# …\` MUST be exactly: ${i.title}
3. Do not change any code. Inside fenced code blocks and inline code spans, translate nothing except comments; the code itself, identifiers, keywords, strings and punctuation stay byte-for-byte. Keep exactly the same inline code spans as the source: do not add, remove or merge backticks. A Chinese term that appears inside an inline code span in the source stays inside that span unchanged (the span is code); put its translation immediately after the span, outside it, e.g. \`一致性\` (consistency). This is the one place a Han character may remain.
4. Keep the same number of fenced code blocks, with the same language tags. Blocks with no language tag or tagged text/txt: keep the same number of non-empty lines; you may translate the words. Every other block follows rule 3.
5. Keep every link and image target exactly as written (targets starting with doc:, section:, home:, asset: or http). Translate only the link text and image alt text.
6. Keep inline HTML only from this set: <br>, <sub>, <sup>, table tags. Do not introduce any other angle-bracket tags in prose; if you must mention a generic type that is not already in a code span, write it without angle brackets.
7. Translate all prose. No Chinese characters may remain in the prose.
8. Keep product and technology names untranslated: ${i.keep.join(', ')}.
9. Preserve the markdown formatting (lists, tables, emphasis, blockquotes).
10. Use this glossary consistently:
${gloss}
11. Glossary values written \`A (B)\`: use A everywhere in the document; write B in parentheses only the first time the concept appears in the document, never again. Never put the parenthetical in a heading: headings use A only; give B at the first use in body prose. Entries without parentheses are used as-is.
12. One term per concept across the whole corpus. Do not invent a second rendering for a glossary term, and do not merge distinct Chinese terms: 宕机 (crash/outage, vi 'sập') and 挂起 (hang, vi 'treo') stay separate; 编排 (orchestration) and 编舞 (choreography) stay separate. A Chinese 编排 that describes services reacting to events with no central coordinator is choreography; otherwise orchestration. 降级 has exactly one rendering per language (see glossary); the word fallback is only the parenthetical gloss or, in English, part of the glossary term. Do not write a second term.
${viRules}15. 接口: when it means an API (HTTP/RPC/service endpoint) write API; when it means a Java-language interface (a Java \`interface\`, 接口 + 实现类, implementing an interface) write \`interface\`. Never 'giao diện' / 'user interface' for 接口.

Chinese source:
-----
${i.zhBody}
-----
`;
}
