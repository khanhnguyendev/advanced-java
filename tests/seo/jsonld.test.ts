import { describe, expect, it } from 'vitest';
import { agentLd, breadcrumbLd, dedupeCrumbs, serializeJsonLd, techArticleLd, websiteLd } from '@/lib/jsonld';

const base = {
  headline: 'Intro',
  description: 'About it',
  inLanguage: 'zh-Hans',
  url: 'https://x.test/zh/c/s/intro',
  siteName: 'advanced-java',
  siteUrl: 'https://x.test',
  creditText: 'Original by Doocs and 中华石杉',
};

describe('serializeJsonLd', () => {
  it('escapes < so </script> cannot appear and still parses back', () => {
    const s = serializeJsonLd({ a: '</script><script>alert(1)</script>', b: 'x<y' });
    expect(s).not.toContain('</script>');
    expect(s).not.toContain('<');
    expect(JSON.parse(s)).toEqual({ a: '</script><script>alert(1)</script>', b: 'x<y' });
  });
});

describe('techArticleLd', () => {
  it('has the required fields and carries the served language of a fallback doc', () => {
    const ld = techArticleLd({ ...base });
    expect(ld['@type']).toBe('TechArticle');
    expect(ld.inLanguage).toBe('zh-Hans');
    expect(ld.license).toBe('https://creativecommons.org/licenses/by-sa/4.0/');
    expect(ld.creditText).toContain('Doocs');
    expect(ld.isPartOf).toEqual({ '@type': 'WebSite', name: 'advanced-java', url: 'https://x.test' });
    expect(ld).not.toHaveProperty('author');
    expect(ld).not.toHaveProperty('datePublished');
    expect(ld).not.toHaveProperty('dateModified');
    expect(() => JSON.parse(serializeJsonLd(ld))).not.toThrow();
  });
  it('adds dateModified only when translatedAt is given', () => {
    expect(techArticleLd({ ...base, dateModified: '2026-10-14' }).dateModified).toBe('2026-10-14');
  });
  it('ignores a malformed dateModified', () => {
    expect(techArticleLd({ ...base, dateModified: 'yesterday' })).not.toHaveProperty('dateModified');
  });
  const credit = { title: 'T', author: 'Martin Fowler', url: 'https://o.test' };
  it('translation: no license, translationOfWork with a Person author', () => {
    const ld = techArticleLd({ ...base, creditText: 'visible text', credit: { ...credit, kind: 'translation' } });
    expect(ld).not.toHaveProperty('license');
    expect(ld.creditText).toBe('visible text');
    expect(ld.translationOfWork).toEqual({ '@type': 'CreativeWork', name: 'T', author: { '@type': 'Person', name: 'Martin Fowler' }, url: 'https://o.test' });
    expect(ld).not.toHaveProperty('isBasedOn');
  });
  it('a credit without kind is a translation', () => {
    expect(techArticleLd({ ...base, credit })).toHaveProperty('translationOfWork');
  });
  it('adaptation: isBasedOn with the original license, an Organization author, no site license', () => {
    const ld = techArticleLd({
      ...base,
      credit: { ...credit, kind: 'adaptation', author: 'Alibaba Sentinel project contributors', license: { name: 'Apache-2.0', url: 'https://a.test/l' } },
    });
    expect(ld).not.toHaveProperty('license');
    expect(ld.isBasedOn).toEqual({
      '@type': 'CreativeWork', name: 'T', author: { '@type': 'Organization', name: 'Alibaba Sentinel project contributors' }, url: 'https://o.test', license: 'https://a.test/l',
    });
  });
  it('derived: citation, never isBasedOn', () => {
    const ld = techArticleLd({ ...base, credit: { ...credit, kind: 'derived' } });
    expect(ld).toHaveProperty('citation');
    expect(ld).not.toHaveProperty('isBasedOn');
    expect(ld).not.toHaveProperty('license');
  });
});

describe('agentLd / dedupeCrumbs', () => {
  it('picks Organization for contributors, project and blog names', () => {
    expect(agentLd('Doocs contributors')['@type']).toBe('Organization');
    expect(agentLd('Some blog')['@type']).toBe('Organization');
    expect(agentLd('Chris Richardson')['@type']).toBe('Person');
  });
  it('collapses equal consecutive names, keeping the current page last', () => {
    const items = [{ name: 'a', url: '1' }, { name: 'a', url: '2' }, { name: 's', url: '3' }, { name: 'd', url: '4' }];
    expect(dedupeCrumbs(items).map((i) => i.url)).toEqual(['1', '3', '4']);
    expect(dedupeCrumbs([{ name: 'a', url: '1' }, { name: 'a', url: '2' }]).map((i) => i.url)).toEqual(['2']);
  });
});

describe('websiteLd / breadcrumbLd', () => {
  it('builds a WebSite without SearchAction', () => {
    const ld = websiteLd({ name: 'advanced-java', url: 'https://x.test/en', inLanguage: 'en', description: 'd' });
    expect(ld['@type']).toBe('WebSite');
    expect(JSON.stringify(ld)).not.toContain('SearchAction');
  });
  it('numbers breadcrumb positions from 1', () => {
    const ld = breadcrumbLd([{ name: 'a', url: 'u1' }, { name: 'b', url: 'u2' }]);
    expect((ld.itemListElement as { position: number }[]).map((i) => i.position)).toEqual([1, 2]);
  });
});
