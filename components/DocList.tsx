import type { NavGroup } from '@/lib/nav';

export function DocList({ groups }: { groups: NavGroup[] }) {
  return (
    <>
      {groups.map((g) => (
        <section key={g.id}>
          <h2>{g.title}</h2>
          <ul>
            {g.docs.map((d) => (
              <li key={d.slug}>
                <a href={d.href}>
                  <span className="doc-id mono">{d.catalogId}</span> {d.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
