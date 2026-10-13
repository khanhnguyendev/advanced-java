import { useTranslations } from 'next-intl';
import type { HeadingInfo } from '@/lib/render/headings';

export function Toc({ headings }: { headings: HeadingInfo[] }) {
  const t = useTranslations('nav');
  const shown = headings.filter((h) => h.depth <= 4);
  if (!shown.length) return null;
  return (
    <nav className="toc" aria-label={t('contents')}>
      <h2 className="rail-label">{t('onThisPage')}</h2>
      <ul>
        {shown.map((h) => (
          <li key={h.id} style={{ paddingInlineStart: `${(h.depth - 2) * 0.75}rem` }}>
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
