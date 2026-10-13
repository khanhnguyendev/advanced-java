export type Glossary = Record<string, string>;

const LANG = { en: 'English', vi: 'Vietnamese' } as const;

export function buildPrompt(i: {
  locale: 'en' | 'vi';
  slug: string;
  zhBody: string;
  glossary: Glossary;
  keep: string[];
}): string {
  const lang = LANG[i.locale];
  const gloss = Object.entries(i.glossary).map(([zh, t]) => `- ${zh} → ${t}`).join('\n');
  return `You are translating one technical document (slug: ${i.slug}) into ${lang}.

Translate directly from the Chinese source below. Do not use any other translation as a source.

Rules (every rule is checked by an automated gate; a violation rejects the file):
1. Output ONLY the translated markdown body. No frontmatter, no commentary, no surrounding code fence.
2. Keep exactly the same number of headings and the same heading levels (# / ## / ### …), in the same order.
3. Do not change any code. Inside fenced code blocks and inline code spans, translate nothing except comments; the code itself, identifiers, keywords, strings and punctuation stay byte-for-byte.
4. Keep the same number of fenced code blocks, with the same language tags. For plain text/ASCII-diagram blocks keep the same number of lines; you may translate the words inside them.
5. Keep every link and image target exactly as written (targets starting with doc:, section:, home:, asset: or http). Translate only the link text and image alt text.
6. Keep inline HTML only from this set: <br>, <sub>, <sup>, table tags. Do not introduce any other angle-bracket tags in prose; write generics such as Map<String, Object> inside code spans.
7. Translate all prose. No Chinese characters may remain in the prose.
8. Keep product and technology names untranslated: ${i.keep.join(', ')}.
9. Preserve the markdown formatting (lists, tables, emphasis, blockquotes).
10. Use this glossary consistently:
${gloss}

Chinese source:
-----
${i.zhBody}
-----
`;
}
