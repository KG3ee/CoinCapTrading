'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Newspaper, Loader2 } from 'lucide-react';

type NewsItem = {
  id: string;
  title: string;
  url: string;
  imageUrl?: string;
};

const FALLBACK_NEWS: NewsItem[] = [
  {
    id: 'news-default',
    title: 'Market News',
    url: 'https://www.coindesk.com/',
    imageUrl: '',
  },
];

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>(FALLBACK_NEWS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/news', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load news links');
        const data = await res.json();
        const nextItems = Array.isArray(data?.items) && data.items.length > 0 ? data.items : FALLBACK_NEWS;
        setItems(
          nextItems.map((item: any, index: number) => ({
            id: item?.id || `news-${index + 1}`,
            title: item?.title || `News ${index + 1}`,
            url: item?.url || FALLBACK_NEWS[0].url,
            imageUrl: item?.imageUrl || '',
          }))
        );
      } catch {
        setItems(FALLBACK_NEWS);
      } finally {
        setLoading(false);
      }
    };
    loadNews();
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">News</h1>
        <p className="text-sm text-gray-400">Latest sources selected by admin.</p>
      </div>

      {loading ? (
        <div className="glass-card border border-white/10 p-6">
          <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
            <Loader2 size={18} className="animate-spin" />
            Loading news sources...
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card border border-white/10 p-0 overflow-hidden hover:border-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-40 object-cover border-b border-white/10"
                  loading="lazy"
                />
              ) : (
                <div className="h-40 border-b border-white/10 bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-cyan-500/20 flex items-center justify-center">
                  <Newspaper size={28} className="text-accent" />
                </div>
              )}

              <div className="p-4 space-y-2">
                <p className="text-sm font-semibold text-white line-clamp-2">{item.title}</p>
                <p className="text-xs text-gray-500 break-all line-clamp-2">{item.url}</p>
                <div className="inline-flex items-center gap-1 text-xs text-accent">
                  Open source
                  <ExternalLink size={13} />
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
