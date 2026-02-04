import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  try {
    const validLocale = ['en', 'es', 'fr', 'de', 'zh', 'ja'].includes(locale) ? locale : 'en';
    const messages = (await import(`./public/locales/${validLocale}.json`)).default;
    return { messages };
  } catch (error) {
    console.error(`Failed to load locale ${locale}:`, error);
    return { messages: (await import('./public/locales/en.json')).default };
  }
});
