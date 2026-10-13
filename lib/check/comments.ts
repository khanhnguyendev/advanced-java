export type CommentFamily = 'c' | 'hash' | 'xml' | 'sql' | 'json' | 'none';

const FAMILY: Record<string, CommentFamily> = {
  java: 'c', javascript: 'c', js: 'c', typescript: 'c', ts: 'c', go: 'c', c: 'c', cpp: 'c', 'c++': 'c',
  scala: 'c', kotlin: 'c', groovy: 'c', rust: 'c', proto: 'c',
  python: 'hash', py: 'hash', shell: 'hash', bash: 'hash', sh: 'hash', yaml: 'hash', yml: 'hash',
  properties: 'hash', conf: 'hash', ruby: 'hash', dockerfile: 'hash',
  xml: 'xml', html: 'xml', sql: 'sql', json: 'json',
};

export function commentFamily(lang: string | null | undefined): CommentFamily {
  return FAMILY[(lang ?? '').toLowerCase()] ?? 'none';
}

export function stripComments(code: string, family: CommentFamily): string {
  switch (family) {
    case 'c':
      return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    case 'sql':
      return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
    case 'hash':
      return code.replace(/#.*$/gm, '');
    case 'xml':
      return code.replace(/<!--[\s\S]*?-->/g, '');
    default:
      return code;
  }
}
