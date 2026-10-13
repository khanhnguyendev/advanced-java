'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

  const saveRef = useRef(save);
  saveRef.current = save;
  const saveIfDwelled = () => {
    if (Date.now() - opened.current >= MIN_DWELL_MS) saveRef.current();
  };
  const saveIfDwelledRef = useRef(saveIfDwelled);
  saveIfDwelledRef.current = saveIfDwelled;

  const restoreRef = useRef(() => {});
  restoreRef.current = () => {
    if (window.location.hash) return;
    const r = restoreFlag(safeStorage(), key, { headings, zhHash });
    if (r) {
      findHeadingElement(document, r.index)?.scrollIntoView();
      setNote(r.changed);
    }
  };

  useEffect(() => {
    restoreRef.current();
  }, []);

  useEffect(() => {
    const onHide = () => saveIfDwelledRef.current();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide();
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Layout-effect cleanup runs before React detaches this page's DOM, so the
  // heading measurement still reflects the page being left.
  useLayoutEffect(() => () => saveIfDwelledRef.current(), []);

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
