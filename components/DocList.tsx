import type { NavGroup } from '@/lib/nav';
import { DocStatus } from './DocStatus';

export function DocList({ groups }: { groups: NavGroup[] }) {
  return (
    <>
      {groups.map((g) => (
        <section key={g.id}>
          <h2>{g.title}</h2>
          <ul>
            {g.docs.map((d) => (
              <li key={d.slug}>
                <a href={d.href} data-status={d.status}>
                  <span className="doc-id mono">{d.catalogId}</span> {d.title}
                </a>{' '}
                <DocStatus status={d.status} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
