import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let locale = 'en';
  try {
    locale = await getLocale();
  } catch (e) {
    locale = 'en';
  }

  let messages = {};
  try {
    messages = await getMessages();
  } catch (e) {
    messages = {};
  }

  return (
    <html lang={locale || 'en'}>
      <body className="bg-[#0a0a0a] text-white overflow-hidden">
        <NextIntlClientProvider messages={messages}>
          <RootLayoutClient>{children}</RootLayoutClient>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
