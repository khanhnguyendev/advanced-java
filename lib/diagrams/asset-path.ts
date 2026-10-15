import { createHash } from 'node:crypto';
import { renderDiagram } from './render';
import type { DiagramLocale, DiagramScene } from './types';

/** URL prefix of the build-time diagram SVG files (route `app/diagram-svg/[file]`). */
export const DIAGRAM_ASSET_BASE = '/diagram-svg';

/**
 * The SVG a document embeds for one diagram instance: the same `renderDiagram` output as before,
 * plus the sideways-scroll floor (`min-width`) that used to be set on the element in the hast stage.
 * `index` is the diagram's ordinal in its document (instance id `doc:<index>`).
 */
export function diagramSvgMarkup(
  scene: DiagramScene,
  labels: Record<string, string>,
  locale: DiagramLocale,
  index: number,
): string {
  const svg = renderDiagram(scene, labels, locale, `doc:${index}`);
  return svg.replace('<svg ', `<svg style="min-width: ${Math.round(0.7 * scene.size.w)}px" `);
}

/** Content-addressed file name: identical markup always maps to one immutable file. */
export function diagramSvgFile(svg: string): string {
  return `${createHash('sha256').update(svg).digest('hex').slice(0, 20)}.svg`;
}

export function diagramSvgUrl(svg: string): string {
  return `${DIAGRAM_ASSET_BASE}/${diagramSvgFile(svg)}`;
}
