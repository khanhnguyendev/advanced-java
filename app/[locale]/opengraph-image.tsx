import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';

// keep in sync with OG_ALT in lib/page-metadata.ts (route exports must be literals)
export const alt = 'advanced-java: Java architecture notes';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const PAPER = '#f4f8fc';
const INK = '#10151f';
const GRID = '#cfdbea';
const COBALT = '#1f4fd8';
const CELL = 48;
const MARGIN = CELL * 3;

function Strip({ left }: { left: boolean }) {
  const cols = MARGIN / CELL;
  const rows = Math.ceil(size.height / CELL) + 1;
  const lines = [];
  for (let i = 0; i <= cols; i++)
    lines.push(<div key={`v${i}`} style={{ position: 'absolute', top: 0, left: i * CELL, width: 1, height: size.height, background: GRID }} />);
  for (let j = 0; j < rows; j++)
    lines.push(<div key={`h${j}`} style={{ position: 'absolute', left: 0, top: j * CELL, width: MARGIN, height: 1, background: GRID }} />);
  return (
    <div style={{ display: 'flex', position: 'absolute', top: 0, [left ? 'left' : 'right']: 0, width: MARGIN, height: size.height }}>{lines}</div>
  );
}

function Mark() {
  const s = 144;
  const inner = s - 12;
  const c = inner / 3;
  return (
    <div style={{ display: 'flex', position: 'relative', width: s, height: s, boxSizing: 'border-box', overflow: 'hidden', background: PAPER, border: `6px solid ${INK}` }}>
      <div style={{ position: 'absolute', left: c, top: 0, width: 2, height: inner, background: GRID }} />
      <div style={{ position: 'absolute', left: 2 * c, top: 0, width: 2, height: inner, background: GRID }} />
      <div style={{ position: 'absolute', top: c, left: 0, width: inner, height: 2, background: GRID }} />
      <div style={{ position: 'absolute', top: 2 * c, left: 0, width: inner, height: 2, background: GRID }} />
      <div style={{ position: 'absolute', left: c, top: c, width: c, height: c, background: COBALT }} />
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site' });
  // The built-in image font has no CJK glyphs: zh uses the Latin line.
  const tagline = locale === 'zh' ? 'Java architecture notes' : t('tagline');
  return new ImageResponse(
    (
      <div style={{ display: 'flex', position: 'relative', width: size.width, height: size.height, background: PAPER }}>
        <Strip left />
        <Strip left={false} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'absolute',
            left: MARGIN + 48,
            top: 0,
            width: size.width - 2 * MARGIN - 96,
            height: size.height,
          }}
        >
          <Mark />
          <div style={{ display: 'flex', marginTop: 48, fontSize: 112, fontWeight: 700, color: INK, letterSpacing: -2 }}>advanced-java</div>
          <div style={{ display: 'flex', marginTop: 16, width: 120, height: 4, background: COBALT }} />
          <div style={{ display: 'flex', marginTop: 24, fontSize: 40, color: '#46526a' }}>{tagline}</div>
        </div>
      </div>
    ),
    size,
  );
}
