import { useTranslations } from 'next-intl';
import type { NavSection } from '@/lib/nav';

/**
 * Section tree. The current section is open; the others are native <details> the reader can open.
 * With no current doc or section (collection page) every section is open.
 */
export function Sidebar({
  nav,
  currentSlug,
  currentSection,
}: {
  nav: NavSection[];
  currentSlug: string;
  currentSection?: string;
}) {
  const t = useTranslations('nav');
  const owner =
    currentSection ??
    nav.find((s) => s.groups.some((g) => g.docs.some((d) => d.slug === currentSlug)))?.id;
  return (
    <nav className="rail" aria-label={t('sidebar')}>
      {nav.map((s) => (
        <details key={s.id} className="rail-section" open={owner === undefined || owner === s.id}>
          <summary>
            <h2 className="ui">{s.title}</h2>
          </summary>
          {s.groups.map((g) => (
            <div key={g.id}>
              <h3 className="ui">{g.title}</h3>
              <ul>
                {g.docs.map((d) => (
                  <li key={d.slug}>
                    <a href={d.href} aria-current={d.slug === currentSlug ? 'page' : undefined} data-status={d.status}>
                      <span className="doc-id mono">{d.catalogId}</span> {d.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </details>
      ))}
    </nav>
  );
}
