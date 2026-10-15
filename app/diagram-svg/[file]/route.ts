import { contentRoot } from '@/lib/content/collection';
import { collectDiagramSvgs } from '@/lib/diagrams/emit';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  return [...collectDiagramSvgs(contentRoot()).keys()].map((file) => ({ file }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const svg = collectDiagramSvgs(contentRoot()).get(file);
  if (!svg) return new Response('not found', { status: 404 });
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
