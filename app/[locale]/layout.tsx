import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { fontVariables } from '@/app/fonts';
import { themeScript } from '@/app/theme-script';
import { routing } from '@/i18n/routing';
import { siteUrl } from '@/lib/seo';
import '../globals.css';

export const dynamicParams = false;
export const revalidate = false;

export const metadata = { metadataBase: new URL(siteUrl()) };

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
  return (
    <html lang={locale} className={fontVariables} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeScript,
          }}
        />
      </head>
      <body>
        <a className="skip-link ui" href="#main-content">
          {skip}
        </a>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
