import type { Metadata } from 'next';
import './globals.css';
import { RootLayoutClient } from './RootLayoutClient';

const DEFAULT_LOCALE = 'en';

export const metadata: Metadata = {
  title: 'CryptoTrade - Crypto Trading Dashboard',
  description: 'Professional crypto trading dashboard with real-time data',
};

async function loadMessages(locale: string) {
  try {
    return (await import(`../public/locales/${locale}.json`)).default;
  } catch {
    return (await import(`../public/locales/${DEFAULT_LOCALE}.json`)).default;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await loadMessages(DEFAULT_LOCALE);

  return (
    <html lang={DEFAULT_LOCALE}>
      <body className="bg-[#0a0a0a] text-white">
        <RootLayoutClient locale={DEFAULT_LOCALE} messages={messages}>
          {children}
        </RootLayoutClient>
      </body>
    </html>
  );
}
