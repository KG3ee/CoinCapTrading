import { getRequestConfig } from 'next-intl/server';

const locales = ['en', 'es', 'fr', 'de', 'zh', 'ja'];

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`../public/locales/${locale}.json`)).default,
}));
