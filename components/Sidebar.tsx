import { useTranslations } from 'next-intl';
import type { NavSection } from '@/lib/nav';

export function Sidebar({ nav, currentSlug }: { nav: NavSection[]; currentSlug: string }) {
  const t = useTranslations('nav');
  return (
    <nav className="rail" aria-label={t('sidebar')}>
      {nav.map((s) => (
        <section key={s.id}>
          <h2 className="ui">{s.title}</h2>
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
        </section>
      ))}
    </nav>
  );
}
