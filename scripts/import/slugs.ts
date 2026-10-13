export function sanitizeSlug(fileName: string): string {
  const slug = fileName
    .replace(/\.md$/i, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['\u2019`]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug === '') throw new Error(`cannot derive a slug from file name: ${fileName}`);
  return slug;
}
