import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AnchorResolver } from '@/components/AnchorResolver';
import { Attribution } from '@/components/Attribution';
import { DocFooter } from '@/components/DocFooter';
import { DocHeader } from '@/components/DocHeader';
import type { SwitcherItem } from '@/components/LanguageSwitcher';
import { MarginSteps } from '@/components/MarginSteps';
import { MobileNav } from '@/components/MobileNav';
import { ResumeFlag } from '@/components/ResumeFlag';
import { SetAside } from '@/components/SetAside';
import { Sidebar } from '@/components/Sidebar';
import { Toc } from '@/components/Toc';
import { TopBar } from '@/components/TopBar';
import { routing } from '@/i18n/routing';
import { contentRoot, listCollections, listDocs, loadCollection, loadMeta } from '@/lib/content/collection';
import { availableLocales, resolveDoc, zhHashOf } from '@/lib/content/fallback';
import { headingsFor } from '@/lib/content/headings-index';
import { LOCALES, type Locale } from '@/lib/content/types';
import { buildNav, flatDocs } from '@/lib/nav';
import { computeNotices } from '@/lib/notices';
import { extractHeadings } from '@/lib/render/headings';
import { renderMarkdown } from '@/lib/render/pipeline';
import { docShape, stepsFor } from '@/lib/steps';
import { upstreamFileUrl } from '@/lib/upstream';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  const root = contentRoot();
  const out: { locale: string; collection: string; section: string; slug: string }[] = [];
  for (const collection of listCollections(root)) {
    for (const d of listDocs(loadCollection(root, collection))) {
      for (const locale of LOCALES) out.push({ locale, collection, section: d.section, slug: d.slug });
    }
  }
  return out;
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ locale: string; collection: string; section: string; slug: string }>;
}) {
  const { locale, collection, section, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const loc = locale as Locale;
  const root = contentRoot();
  const c = loadCollection(root, collection);
  const doc = resolveDoc(root, c, loc, section, slug);
  if (!doc) notFound();

  const { html, headings } = await renderMarkdown(
    doc.body,
    {
      collection,
      routeLocale: loc,
      currentHeadings: extractHeadings(doc.body),
      headingsOf: (cc, ss, sl) => headingsFor(root, loadCollection(root, cc), loc, ss, sl),
    },
    { docRef: `${locale}/${collection}/${section}/${slug}` },
  );

  const names = await getTranslations('languages');
  const tn = await getTranslations('nav');
  const nav = buildNav(root, c, loc);
  const flat = flatDocs(nav);
  const at = flat.findIndex((d) => d.slug === slug);

  const zhHash = zhHashOf(root, c, section, slug);
  const zhDoc = resolveDoc(root, c, c.sourceLocale, section, slug)!;
  const zhHeadings = extractHeadings(zhDoc.body);
  const notices = computeNotices({
    requested: loc,
    served: doc.served,
    sourceLocale: c.sourceLocale,
    status: doc.frontmatter?.status,
    sourceHash: doc.frontmatter?.source.hash,
    zhHash,
  });
  const title =
    loadMeta(root, c.id, doc.served).docs[slug]?.title ??
    loadMeta(root, c.id, c.sourceLocale).docs[slug]?.title ??
    slug;

  const have = new Set(availableLocales(root, c, section, slug));
  const switcher: SwitcherItem[] = LOCALES.map((l) => ({
    locale: l,
    label: names(l),
    href: `/${l}/${collection}/${section}/${slug}`,
    status: !have.has(l)
      ? 'fallback'
      : l === c.sourceLocale || resolveDoc(root, c, l, section, slug)!.frontmatter?.status === 'reviewed'
        ? 'translated'
        : 'machine',
  }));

  return (
    <div className="shell">
      <div style={{ gridColumn: '1 / -1' }}>
        <TopBar locale={loc} collectionId={c.id} collectionTitle={c.id} homeHref={`/${loc}`} switcher={switcher} />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <MobileNav label={tn('menu')}>
          <Sidebar nav={nav} currentSlug={slug} />
          <Toc headings={headings} />
        </MobileNav>
      </div>
      <Sidebar nav={nav} currentSlug={slug} />
      <div className="reader">
        <DocHeader
          catalogId={c.ids[slug]}
          title={title}
          notices={notices}
          requestedName={names(loc)}
          servedName={names(doc.served)}
          originalHref={upstreamFileUrl(c, slug)}
        />
        <ResumeFlag
          collection={collection}
          catalogId={c.ids[slug]}
          zhHash={zhHash}
          headings={headings.map((h) => ({ index: h.index, text: h.text }))}
        />
        <SetAside collection={collection} catalogId={c.ids[slug]} />
        <article
          className="prose"
          lang={doc.served === 'zh' ? 'zh-Hans' : doc.served}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <DocFooter prev={flat[at - 1]} next={flat[at + 1]} />
        <Attribution
          kind={doc.served === 'zh' ? 'zh' : 'translated'}
          fileUrl={upstreamFileUrl(c, slug)}
          aboutHref={`/${loc}/about`}
        />
      </div>
      <div className="toc-rail">
        <Toc headings={headings} />
        <MarginSteps steps={stepsFor(headings, docShape(zhHeadings))} />
      </div>
      <AnchorResolver />
    </div>
  );
}
