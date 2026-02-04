import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import './globals.css';
import { RootLayoutClient } from './RootLayoutClient';

export const metadata: Metadata = {
  title: 'CryptoTrade - Crypto Trading Dashboard',
  description: 'Professional crypto trading dashboard with real-time data',
};

export async function generateStaticParams() {
  return [
    { locale: 'en' },
    { locale: 'es' },
    { locale: 'fr' },
    { locale: 'de' },
    { locale: 'zh' },
    { locale: 'ja' },
  ];
}

async function getMessages(locale: string) {
  const validLocale = ['en', 'es', 'fr', 'de', 'zh', 'ja'].includes(locale) ? locale : 'en';
  
  try {
    return (await import(`../public/locales/${validLocale}.json`)).default;
  } catch (error) {
    console.error(`Failed to load locale ${validLocale}:`, error);
    return (await import('../public/locales/en.json')).default;
  }
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages(locale || 'en');

  return (
    <html lang={locale || 'en'}>
      <body className="bg-[#0a0a0a] text-white overflow-hidden">
        <NextIntlClientProvider messages={messages} locale={locale || 'en'}>
          <RootLayoutClient>{children}</RootLayoutClient>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
