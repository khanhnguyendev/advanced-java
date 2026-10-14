import { useTranslations } from 'next-intl';
import type { NavGroup } from '@/lib/nav';
import { countStatuses } from '@/lib/stats';

export function SectionCount({ groups }: { groups: NavGroup[] }) {
  const t = useTranslations('doc');
  const docs = groups.flatMap((g) => g.docs);
  const { translated, machine } = countStatuses(docs.map((d) => d.status));
  return (
    <span className="mono">
      <span className="ui">{t('translated')}:</span> {translated} / {docs.length}
      {machine > 0 ? (
        <>
          {' '}
          <span className="ui">
            {t('machineStatus')}: {machine}
          </span>
        </>
      ) : null}
    </span>
  );
}
