import { useTranslations } from 'next-intl';
import type { NavDoc } from '@/lib/nav';

export function DocStatus({ status }: { status: NavDoc['status'] }) {
  const t = useTranslations('doc');
  const label = status === 'translated' ? t('translated') : status === 'machine' ? t('machineStatus') : t('fallback');
  return <span className="doc-status ui">{label}</span>;
}
