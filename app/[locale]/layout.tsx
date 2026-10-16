import type { Viewport } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import CjkFont from '@/components/CjkFont';
import { PrefetchLinks } from '@/components/PrefetchLinks';
import { fontVariables } from '@/app/fonts';
import { themeScript } from '@/app/theme-script';
import { routing } from '@/i18n/routing';
import { CLIENT_NAMESPACES } from '@/i18n/client-namespaces';
import { siteUrl } from '@/lib/seo';
import '../globals.css';

export const dynamicParams = false;
export const revalidate = false;

export const metadata = { metadataBase: new URL(siteUrl()) };

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f8fc' },
    { media: '(prefers-color-scheme: dark)', color: '#0a2540' },
  ],
};

// Chromium prefetches same-origin documents on hover intent; never prerender (no side effects, no JS run).
const speculationRules = JSON.stringify({
  prefetch: [
    {
      where: {
        and: [
          { href_matches: '/*' },
          { not: { href_matches: '/*/review/*' } },
          { not: { href_matches: '/_content/*' } },
          { not: { href_matches: '/diagram-svg/*' } },
          { not: { href_matches: '/pagefind/*' } },
          { not: { selector_matches: '[rel~=nofollow], [data-no-prefetch], .lang-switcher a, a[download], a[target=_blank]' } },
        ],
      },
      eagerness: 'moderate',
    },
  ],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const skip = (await getTranslations('nav'))('skip');
  const all = (await getMessages()) as Record<string, unknown>;
  const clientMessages = Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, all[ns]]));
  return (
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeScript,
          }}
        />
        <script type="speculationrules" dangerouslySetInnerHTML={{ __html: speculationRules }} />
      </head>
      <body>
        <a className="skip-link ui" href="#main-content">
          {skip}
        </a>
        <NextIntlClientProvider messages={clientMessages}>{children}</NextIntlClientProvider>
        <PrefetchLinks />
        {locale === 'zh' ? <CjkFont /> : null}
      </body>
    </html>
  );
}
