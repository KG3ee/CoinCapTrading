'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Newspaper, Loader2 } from 'lucide-react';

type NewsConfig = {
  title: string;
  url: string;
};

const DEFAULT_NEWS: NewsConfig = {
  title: 'Market News',
  url: 'https://www.coindesk.com/',
};

export default function NewsPage() {
  const [news, setNews] = useState<NewsConfig>(DEFAULT_NEWS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/news', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load news link');
        const data = await res.json();
        const nextNews = data?.news || DEFAULT_NEWS;
        setNews({
          title: nextNews.title || DEFAULT_NEWS.title,
          url: nextNews.url || DEFAULT_NEWS.url,
        });
      } catch {
        setNews(DEFAULT_NEWS);
      } finally {
        setLoading(false);
      }
    };
    loadNews();
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">News</h1>
        <p className="text-sm text-gray-400">Latest source selected by admin.</p>
      </div>

      <div className="glass-card border border-white/10 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
            <Loader2 size={18} className="animate-spin" />
            Loading news source...
          </div>
        ) : (
          <div className="space-y-2">
            <a
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-lg font-semibold text-white hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              <Newspaper size={18} className="text-accent" />
              {news.title}
              <ExternalLink size={16} />
            </a>
            <p className="text-xs text-gray-500 break-all">{news.url}</p>
          </div>
        )}
      </div>
    </div>
  );
}
