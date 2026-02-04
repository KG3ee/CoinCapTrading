import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import './globals.css';
import { RootLayoutClient } from './RootLayoutClient';

export const metadata: Metadata = {
  title: 'CryptoTrade - Crypto Trading Dashboard',
  description: 'Professional crypto trading dashboard with real-time data',
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="bg-[#0a0a0a] text-white overflow-hidden">
        <NextIntlClientProvider messages={messages}>
          <RootLayoutClient>{children}</RootLayoutClient>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
