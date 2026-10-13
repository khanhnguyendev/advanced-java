'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { currentHeadingIndex, findHeadingElement } from '@/lib/anchor';
import { flagKey, restoreFlag, safeStorage, saveFlag } from '@/lib/resume';

const MIN_DWELL_MS = 8000;

export function ResumeFlag({
  collection,
  catalogId,
  zhHash,
  headings,
}: {
  collection: string;
  catalogId: string;
  zhHash: string;
  headings: { index: number; text: string }[];
}) {
  const t = useTranslations('resume');
  const [note, setNote] = useState(false);
  const opened = useRef(Date.now());
  const key = flagKey(collection, catalogId);

  const save = () => {
    const idx = currentHeadingIndex(document);
    const h = headings.find((x) => x.index === idx);
    if (!idx || !h) return;
    saveFlag(safeStorage(), key, {
      headingIndex: idx,
      headingText: h.text,
      headingCount: headings.length,
      zhHash,
      savedAt: Date.now(),
    });
  };

  useEffect(() => {
    if (!window.location.hash) {
      const r = restoreFlag(safeStorage(), key, { headings, zhHash });
      if (r) {
        findHeadingElement(document, r.index)?.scrollIntoView();
        setNote(r.changed);
      }
    }
    const onHide = () => Date.now() - opened.current >= MIN_DWELL_MS && save();
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      onHide();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="resume ui">
      <button type="button" onClick={save}>
        {t('mark')}
      </button>
      {note ? (
        <p role="note" className="notice">
          {t('updated')}
        </p>
      ) : null}
    </div>
  );
}
