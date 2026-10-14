'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { flagKey, safeStorage, type FlagRecord } from '@/lib/resume';

export interface ResumeDoc { catalogId: string; title: string; href: string }

/** The newest stored resume flag among `docs`, or null. Reads localStorage; client only. */
export function newestFlag(store: Storage | null, collection: string, docs: ResumeDoc[]): ResumeDoc | null {
  if (!store) return null;
  let best: { doc: ResumeDoc; at: number } | null = null;
  for (const doc of docs) {
    try {
      const raw = store.getItem(flagKey(collection, doc.catalogId));
      if (!raw) continue;
      const rec = JSON.parse(raw) as Partial<FlagRecord> | null;
      if (!rec || typeof rec.headingIndex !== 'number') continue;
      const at = typeof rec.savedAt === 'number' ? rec.savedAt : 0;
      if (!best || at > best.at) best = { doc, at };
    } catch {
      /* unreadable record: ignore */
    }
  }
  return best?.doc ?? null;
}

/**
 * Server output is the Start link (children). After mount, a stored resume flag replaces it, so the
 * server and first client render always agree.
 */
export function PrimaryAction({
  collection,
  docs,
  children,
}: {
  collection: string;
  docs: ResumeDoc[];
  children: React.ReactNode;
}) {
  const t = useTranslations('home');
  const [doc, setDoc] = useState<ResumeDoc | null>(null);
  useEffect(() => {
    setDoc(newestFlag(safeStorage(), collection, docs));
  }, [collection, docs]);
  if (!doc) return <>{children}</>;
  return (
    <p className="index-primary ui">
      <a href={doc.href} data-primary="resume">
        <span className="index-primary-label">{t('resume')}</span>
        <span className="index-primary-doc">
          <span className="mono">{doc.catalogId}</span> {doc.title}
        </span>
      </a>
    </p>
  );
}
