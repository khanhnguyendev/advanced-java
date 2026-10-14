import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { contentRoot } from '@/lib/content/collection';
import { buildReviewData, CREDIT_LINE } from '@/lib/diagrams/review-data';
import { DIAGRAM_LOCALES } from '@/lib/diagrams/types';

export const dynamicParams = false;
export const revalidate = false;

const enabled = () => process.env.DIAGRAM_REVIEW === '1';

export function generateStaticParams() {
  return enabled() ? routing.locales.map((locale) => ({ locale })) : [];
}

export const metadata: Metadata = {
  title: 'Diagram review',
  robots: { index: false, follow: false },
};

const rule = '1px solid var(--rule)';

export default async function DiagramReview({ params }: { params: Promise<{ locale: string }> }) {
  if (!enabled()) notFound();
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const data = buildReviewData(contentRoot());
  return (
    <main
      id="main-content"
      className="ui"
      data-testid="diagram-review"
      style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.5rem 1rem', color: 'var(--ink)' }}
    >
      <h1>Diagram review</h1>
      <p data-testid="review-summary" style={{ color: 'var(--ink-muted)' }}>
        {data.count} diagrams, {data.errorCount} gate errors, built {data.buildDate}
      </p>
      {data.entries.map((e) => (
        <section
          key={e.id}
          data-diagram={e.id}
          style={{ borderTop: rule, paddingTop: '1rem', marginTop: '2rem' }}
        >
          <h2 style={{ overflowWrap: 'anywhere' }}>
            <code>{e.id}</code> <small style={{ color: 'var(--ink-muted)' }}>class: {e.className}</small>
          </h2>
          <p style={{ color: 'var(--ink-muted)', overflowWrap: 'anywhere' }}>
            license: {e.license} · upstream: <code>{e.upstream}</code>
          </p>
          <p data-testid="gate-status" style={{ color: e.errors.length ? 'var(--accent)' : 'var(--ink-muted)' }}>
            Gate: {e.errors.length === 0 ? 'OK, 0 errors' : `${e.errors.length} error(s)`}
          </p>
          {e.errors.length > 0 && (
            <ul>
              {e.errors.map((er, i) => (
                <li key={i} style={{ overflowWrap: 'anywhere' }}>
                  <code>{er.code}</code>
                  {er.locale ? ` [${er.locale}]` : ''}: {er.message}
                </li>
              ))}
            </ul>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))',
              gap: '1.5rem',
              alignItems: 'start',
            }}
          >
            <figure style={{ margin: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={e.imageUrl}
                alt={`Upstream image for ${e.id}`}
                style={{ maxWidth: '100%', height: 'auto', border: rule }}
              />
              <figcaption style={{ color: 'var(--ink-muted)' }}>Upstream</figcaption>
            </figure>
            <div>
              {DIAGRAM_LOCALES.map((loc) => (
                <div key={loc} data-locale={loc} style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem' }}>{loc}</h3>
                  {e.svgs[loc] === null ? (
                    <p>No labels for {loc}.</p>
                  ) : (
                    [720, 360].map((w) => (
                      <div
                        key={w}
                        data-width={w}
                        style={{
                          maxWidth: w,
                          width: '100%',
                          marginBottom: '1rem',
                          background: 'var(--paper)',
                          border: rule,
                        }}
                        dangerouslySetInnerHTML={{ __html: e.svgs[loc] as string }}
                      />
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
          <p style={{ color: 'var(--ink-muted)' }}>{CREDIT_LINE}</p>
        </section>
      ))}
    </main>
  );
}
