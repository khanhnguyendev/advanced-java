import { useTranslations } from 'next-intl';
import type { Step } from '@/lib/steps';

export function MarginSteps({ steps }: { steps: Step[] }) {
  const t = useTranslations('steps');
  if (!steps.length) return null;
  return (
    <aside className="margin-steps" aria-label={t('section')}>
      <h2 className="rail-label">{t('section')}</h2>
      <ol>
        {steps.map((s) => (
          <li key={s.id}>
            <span className="mono">{String(s.number).padStart(2, '0')}</span>
            <a href={`#${s.id}`}>{s.labelKey ? t(s.labelKey) : s.text}</a>
          </li>
        ))}
      </ol>
    </aside>
  );
}
