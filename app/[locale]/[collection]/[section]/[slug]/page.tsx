import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AnchorResolver } from '@/components/AnchorResolver';
import { Attribution } from '@/components/Attribution';
import { DocFooter } from '@/components/DocFooter';
import { DocHeader } from '@/components/DocHeader';
import type { SwitcherItem } from '@/components/LanguageSwitcher';
import { MarginSteps } from '@/components/MarginSteps';
import { MobileDock } from '@/components/MobileDock';
import { CurrentDocScroll } from '@/components/CurrentDocScroll';
import { ResumeFlag } from '@/components/ResumeFlag';
import { SetAside } from '@/components/SetAside';
import { Sidebar } from '@/components/Sidebar';
import { LazyDiagrams } from '@/components/LazyDiagrams';
import { ScrollRegions } from '@/components/ScrollRegions';
import { Toc } from '@/components/Toc';
import { TocSpy } from '@/components/TocSpy';
import { TopBar } from '@/components/TopBar';
import { routing } from '@/i18n/routing';
import { contentRoot, listCollections, listDocs, loadCollection } from '@/lib/content/collection';
import { creditFor, loadCredits } from '@/lib/content/credits';
import { availableLocales, resolveDoc, zhHashOf } from '@/lib/content/fallback';
import { docTitleOf } from '@/lib/content/title';
import CjkFont from '@/components/CjkFont';
import { needsCjkFont } from '@/lib/cjk';
import { headingsFor } from '@/lib/content/headings-index';
import { LOCALES, type CollectionConfig, type Locale } from '@/lib/content/types';
import { buildNav, flatDocs } from '@/lib/nav';
import { extractHeadings } from '@/lib/render/headings';
import { fsLinkTargets } from '@/lib/render/links';
import { fsDiagramSource } from '@/lib/diagrams/source';
import { renderMarkdown } from '@/lib/render/pipeline';
import { docAlternates, siteUrl } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { describeBody } from '@/lib/description';
import { creditPlainText, type PlainTranslator } from '@/lib/credit-text';
import { breadcrumbLd, techArticleLd } from '@/lib/jsonld';
import { BCP47, pageMetadata, SITE_NAME } from '@/lib/page-metadata';
import { docShape, stepsFor } from '@/lib/steps';
import { upstreamFileUrl } from '@/lib/upstream';

export const dynamicParams = false;
export const revalidate = false;

export function generateStaticParams() {
  const root = contentRoot();
  const out: { locale: string; collection: string; section: string; slug: string }[] = [];
  for (const collection of listCollections(root)) {
    for (const d of listDocs(loadCollection(root, collection))) {
      for (const locale of routing.locales) out.push({ locale, collection, section: d.section, slug: d.slug });
    }
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; collection: string; section: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, collection, section, slug } = await params;
  const root = contentRoot();
  const c = loadCollection(root, collection);
  const alt = docAlternates(root, c, locale as Locale, section, slug);
  const doc = resolveDoc(root, c, locale as Locale, section, slug);
  const title = docTitleOf(root, c, doc?.served, slug).title;
  const seo = await getTranslations({ locale, namespace: 'seo' });
  const secTitle = buildNav(root, c, locale as Locale).find((s) => s.id === section)?.title ?? section;
  const description = (doc && describeBody(doc.body)) || seo('docFallback', { title, section: secTitle });
  return pageMetadata({
    title,
    description,
    canonical: alt.canonical,
    languages: alt.languages,
    locale: doc?.served ?? (c.sourceLocale as Locale),
    available: availableLocales(root, c, section, slug),
    type: 'article',
    routeLocale: locale as Locale,
  });
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

  const td = await getTranslations('diagram');
  const { html, headings } = await renderMarkdown(
    doc.body,
    {
      collection,
      routeLocale: loc,
      currentHeadings: extractHeadings(doc.body),
      ...fsLinkTargets(root),
      bodyLocale: doc.served,
      diagrams: fsDiagramSource(root, collection),
      diagramCredit: td('credit'),
      diagramCreditThirdParty: (a) =>
        a.licenseName
          ? td('creditThirdPartyLicensed', { title: a.title, author: a.author, licenseName: a.licenseName })
          : td('creditThirdParty', { title: a.title, author: a.author }),
      headingsOf: (cc, ss, sl) =>
        listCollections(root).includes(cc) ? headingsFor(root, loadCollection(root, cc), loc, ss, sl) : null,
    },
    { docRef: `${locale}/${collection}/${section}/${slug}` },
  );

  const names = await getTranslations('languages');
  const nav = buildNav(root, c, loc);
  const flat = flatDocs(nav);
  const at = flat.findIndex((d) => d.href === `/${loc}/${collection}/${section}/${slug}`);
  const prev = at > 0 ? flat[at - 1] : undefined;
  const next = at >= 0 ? flat[at + 1] : undefined;

  const zhHash = zhHashOf(root, c, section, slug);
  const zhDoc = doc.served === c.sourceLocale ? doc : resolveDoc(root, c, c.sourceLocale, section, slug)!;
  const zhHeadings = extractHeadings(zhDoc.body);
  const { title, lang: titleLang } = docTitleOf(root, c, doc.served, slug);

  const contentLang = doc.served === 'zh' ? 'zh-Hans' : doc.served;
  const upstreamUrl = upstreamFileUrl(c, slug);
  const steps = stepsFor(headings, docShape(zhHeadings));
  const switcher: SwitcherItem[] = LOCALES.map((l) => ({
    locale: l,
    label: names(l),
    href: `/${l}/${collection}/${section}/${slug}`,
  }));

  const tSite = await getTranslations('site');
  const tAttr = await getTranslations('attribution');
  const tSeo = await getTranslations('seo');
  const base = siteUrl();
  const secTitle = nav.find((s) => s.id === section)?.title ?? section;
  const sourceCredit = creditFor(loadCredits(root, collection), section, slug);
  const canonicalUrl = base + docAlternates(root, c, loc, section, slug).canonical;
  const articleLd = techArticleLd({
    headline: title,
    description: describeBody(doc.body) || tSeo('docFallback', { title, section: secTitle }),
    inLanguage: BCP47[doc.served],
    url: canonicalUrl,
    siteName: SITE_NAME,
    siteUrl: base,
    creditText: sourceCredit
      ? creditPlainText(tAttr as unknown as PlainTranslator, sourceCredit, doc.served)
      : tAttr('credit'),
    dateModified: doc.frontmatter?.translatedAt,
    credit: sourceCredit,
  });
  const crumbs = breadcrumbLd([
    { name: tSite('title'), url: `${base}/${loc}` },
    { name: c.id, url: `${base}/${loc}/${collection}` },
    { name: secTitle, url: `${base}/${loc}/${collection}/${section}` },
    { name: title, url: canonicalUrl },
  ]);

  return (
    <div className="shell">
      {/* the zh layout mounts CjkFont; en/vi pages that fall back to zh content need it here */}
      {needsCjkFont(loc, contentLang, titleLang) ? <CjkFont /> : null}
      <JsonLd data={articleLd} />
      <JsonLd data={crumbs} />
      <div className="topbar-slot">
        <TopBar locale={loc} collectionId={c.id} collectionTitle={c.id} homeHref={`/${loc}`} switcher={switcher} hasDock />
      </div>
      <Sidebar nav={nav} currentSlug={slug} />
      <main id="main-content" tabIndex={-1} className="reader reader-docked">
        <div className="doc-col">
        <DocHeader
          catalogId={c.ids[slug]}
          title={title}
          titleLang={titleLang}
        />
        <div className="doc-actions">
          <ResumeFlag
            collection={collection}
            catalogId={c.ids[slug]}
            zhHash={zhHash}
            headings={headings.map((h) => ({ index: h.index, text: h.text }))}
          />
          <SetAside collection={collection} catalogId={c.ids[slug]} />
        </div>
        <article
          className="prose"
          lang={contentLang}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <DocFooter prev={prev} next={next} />
        <Attribution
          kind={doc.served === 'zh' ? 'zh' : 'translated'}
          fileUrl={upstreamUrl}
          aboutHref={`/${loc}/about`}
          credit={creditFor(loadCredits(root, collection), section, slug)}
          served={doc.served}
          creditLang={loc === 'zh' ? 'zh-Hans' : loc}
        />
        </div>
      </main>
      <div className="toc-rail">
        <Toc headings={headings} />
        <MarginSteps steps={steps} />
      </div>
      <MobileDock
        prev={prev && { href: prev.href, title: prev.title }}
        next={next && { href: next.href, title: next.title }}
        switcher={switcher}
        current={loc}
      />
      <AnchorResolver />
      <CurrentDocScroll />
      <TocSpy />
      <ScrollRegions />
      <LazyDiagrams />
    </div>
  );
}
