import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  const validLocale = ['en', 'es', 'fr', 'de', 'zh', 'ja'].includes(locale) ? locale : 'en';
  
  try {
    const messages = (await import(`./public/locales/${validLocale}.json`)).default;
    return { messages };
  } catch (error) {
    console.error(`Failed to load locale ${validLocale}:`, error);
    // Fallback to English
    const fallbackMessages = (await import('./public/locales/en.json')).default;
    return { messages: fallbackMessages };
  }
});
