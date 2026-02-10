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

const FETCH_TIMEOUT_MS = 4500;

function normalizeUrl(value: string) {
  try {
    const normalized = new URL(value);
    if (!/^https?:$/.test(normalized.protocol)) return '';
    return normalized.toString();
  } catch {
    return '';
  }
}

function extractMetaContent(html: string, keys: string[]) {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`<meta[^>]*property=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i'),
      new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${escaped}["'][^>]*>`, 'i'),
      new RegExp(`<meta[^>]*name=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i'),
      new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${escaped}["'][^>]*>`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
  }
  return '';
}

function extractTitle(html: string) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch?.[1]?.trim() || '';
}

async function fetchNewsMetadata(url: string) {
  const normalized = normalizeUrl(url);
  if (!normalized) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(normalized, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CoinCapTradingBot/1.0 (+https://coincaptrading.local)',
        Accept: 'text/html,application/xhtml+xml',
      },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const html = await response.text();
    const title =
      extractMetaContent(html, ['og:title', 'twitter:title']) ||
      extractTitle(html);
    const rawImage =
      extractMetaContent(html, ['og:image', 'twitter:image']) ||
      '';

    let imageUrl = '';
    if (rawImage) {
      try {
        imageUrl = new URL(rawImage, normalized).toString();
      } catch {
        imageUrl = '';
      }
    }

    return { title, imageUrl };
  } catch (error: any) {
    log.warn({ error, url: normalized }, 'Failed to fetch news metadata');
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  try {
    await connectDB();
    const settings = await (AdminSettings as any).getSettings();
    const rawItems = Array.isArray(settings?.news?.items) && settings.news.items.length > 0
      ? settings.news.items
      : [
          {
            id: 'news-default',
            title: settings?.news?.title || FALLBACK_NEWS.title,
            url: settings?.news?.url || FALLBACK_NEWS.url,
            imageUrl: '',
          },
        ];
    const enrichedItems = await Promise.all(
      rawItems.map(async (item: any, index: number) => {
        const url = item?.url || FALLBACK_NEWS.url;
        const metadata = await fetchNewsMetadata(url);
        const fallbackTitle = item?.title || `News ${index + 1}`;
        return {
          id: item?.id || `news-${index + 1}`,
          title: metadata?.title || fallbackTitle,
          url,
          imageUrl: item?.imageUrl || metadata?.imageUrl || '',
        };
      })
    );
    const newsItems = enrichedItems.length > 0 ? enrichedItems : [FALLBACK_NEWS];
    const primary = newsItems[0] || FALLBACK_NEWS;

    return NextResponse.json({
      news: {
        title: primary.title || FALLBACK_NEWS.title,
        url: primary.url || FALLBACK_NEWS.url,
        imageUrl: primary.imageUrl || '',
      },
      items: newsItems,
    });
  } catch (error: any) {
    log.error({ error }, 'Failed to load news settings');
    return NextResponse.json({ news: FALLBACK_NEWS, items: [FALLBACK_NEWS] });
  }
}
