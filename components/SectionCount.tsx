import { useTranslations } from 'next-intl';
import type { NavGroup } from '@/lib/nav';

export function SectionCount({ groups }: { groups: NavGroup[] }) {
  const t = useTranslations('doc');
  const docs = groups.flatMap((g) => g.docs);
  const translated = docs.filter((d) => d.status === 'translated').length;
  const machine = docs.filter((d) => d.status === 'machine').length;
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
