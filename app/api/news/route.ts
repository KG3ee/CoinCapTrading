import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AdminSettings from '@/lib/models/AdminSettings';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'NewsConfigRoute' });

const FALLBACK_NEWS = {
  id: 'news-default',
  title: 'Market News',
  url: 'https://www.coindesk.com/',
  imageUrl: '',
};

export async function GET() {
  try {
    await connectDB();
    const settings = await (AdminSettings as any).getSettings();
    const newsItems = Array.isArray(settings?.news?.items) && settings.news.items.length > 0
      ? settings.news.items
      : [
          {
            id: 'news-default',
            title: settings?.news?.title || FALLBACK_NEWS.title,
            url: settings?.news?.url || FALLBACK_NEWS.url,
            imageUrl: '',
          },
        ];
    const primary = newsItems[0] || FALLBACK_NEWS;

    return NextResponse.json({
      news: {
        title: primary.title || FALLBACK_NEWS.title,
        url: primary.url || FALLBACK_NEWS.url,
        imageUrl: primary.imageUrl || '',
      },
      items: newsItems.map((item: any, index: number) => ({
        id: item.id || `news-${index + 1}`,
        title: item.title || `News ${index + 1}`,
        url: item.url || FALLBACK_NEWS.url,
        imageUrl: item.imageUrl || '',
      })),
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to load news settings');
    return NextResponse.json({ news: FALLBACK_NEWS, items: [FALLBACK_NEWS] });
  }
}
