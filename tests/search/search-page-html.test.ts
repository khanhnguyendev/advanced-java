import { describe, expect, it } from 'vitest';
import { searchPageHtml, type CorpusDoc } from '../../scripts/search-gate/corpus';

const doc = (o: Partial<CorpusDoc> = {}): CorpusDoc => ({
  slug: 'mq-design', section: 'hc', title: 'Thiết kế', body: 'Nội dung', lang: 'vi', fallback: false, href: '/vi/c/hc/mq-design', ...o,
});

describe('searchPageHtml', () => {
  it('uses the route locale as <html lang> for a zh fallback doc and flags it', () => {
    const html = searchPageHtml(doc({ lang: 'zh', fallback: true, title: '设计', body: '正文' }), 'vi', 'c');
    expect(html).toContain('<html lang="vi">');
    expect(html).toContain('data-pagefind-meta="fallback:true"');
    expect(html).toContain('data-pagefind-meta="lang:zh"');
    expect(html).toContain('data-pagefind-meta="href:/vi/c/hc/mq-design"');
    expect(html).toContain('data-pagefind-filter="collection:c"');
  });
  it('marks native docs as fallback:false', () => {
    expect(searchPageHtml(doc(), 'vi', 'c')).toContain('data-pagefind-meta="fallback:false"');
  });
  it('encodes commas in meta values', () => {
    const html = searchPageHtml(doc({ slug: 'a,b', href: '/vi/c/hc/a,b' }), 'vi', 'c');
    expect(html).toContain('data-pagefind-meta="slug:a%2Cb"');
    expect(html).toContain('data-pagefind-meta="href:/vi/c/hc/a%2Cb"');
  });
  it('escapes <, & and " in title and body', () => {
    const html = searchPageHtml(doc({ title: 'a<b>&"c"', body: '<script>x</script> & "q"', lang: 'en' }), 'en', 'c');
    expect(html).toContain('<h1>a&lt;b&gt;&amp;&quot;c&quot;</h1>');
    expect(html).toContain('<p>&lt;script&gt;x&lt;/script&gt; &amp; &quot;q&quot;</p>');
    expect(html).not.toContain('<script>');
  });
  it('adds a weight-0.5 folded paragraph only for vi and only when folding changes the text', () => {
    const vi = searchPageHtml(doc(), 'vi', 'c');
    expect(vi).toContain('<p data-pagefind-weight="0.5">Thiet ke Noi dung</p>');
    expect(searchPageHtml(doc(), 'en', 'c')).not.toContain('data-pagefind-weight');
    expect(searchPageHtml(doc({ title: 'Design', body: 'Plain' }), 'vi', 'c')).not.toContain('data-pagefind-weight');
  });
});
