import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import AdminSettings from '@/lib/models/AdminSettings';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const log = logger.child({ module: 'NewsConfigRoute' });

const FALLBACK_NEWS = {
  title: 'Market News',
  url: 'https://www.coindesk.com/',
};

export async function GET() {
  try {
    await connectDB();
    const settings = await (AdminSettings as any).getSettings();
    const news = settings?.news || FALLBACK_NEWS;
    return NextResponse.json({
      news: {
        title: news.title || FALLBACK_NEWS.title,
        url: news.url || FALLBACK_NEWS.url,
      },
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to load news settings');
    return NextResponse.json({ news: FALLBACK_NEWS });
  }
}
