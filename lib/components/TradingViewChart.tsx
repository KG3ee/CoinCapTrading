'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AVAILABLE_CRYPTOS } from '@/lib/constants';

interface TradingViewChartProps {
  coinId: string;
  coinName: string;
  height?: string;
  showPrice?: boolean;
  currentPrice?: number;
}

function getSymbolFromCoinId(coinId: string) {
  const normalized = coinId.trim().toLowerCase();
  const matched = AVAILABLE_CRYPTOS.find((crypto) => crypto.id === normalized);
  if (matched) return matched.symbol;
  return normalized.replace(/[^a-z0-9]/g, '').toUpperCase() || 'BTC';
}

export const TradingViewChart = memo(function TradingViewChart({
  coinId,
  coinName,
  height = 'h-96',
  showPrice = true,
  currentPrice,
}: TradingViewChartProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const readTheme = () => {
      setTheme(root.classList.contains('theme-light') ? 'light' : 'dark');
    };

    readTheme();

    const observer = new MutationObserver(readTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const symbol = useMemo(() => getSymbolFromCoinId(coinId), [coinId]);

  const iframeSrc = useMemo(() => {
    const query = new URLSearchParams({
      symbol: `BINANCE:${symbol}USDT`,
      interval: '60',
      theme,
      style: '1',
      locale: 'en',
      timezone: 'Etc/UTC',
      withdateranges: '1',
      hideideas: '1',
      studies: JSON.stringify(['Volume@tv-basicstudies']),
      toolbarbg: theme === 'light' ? '#f3f6fb' : '#11141c',
      saveimage: '1',
      calendar: '0',
      hotlist: '0',
      watchlist: '0',
      details: '1',
      hide_side_toolbar: '0',
      allow_symbol_change: '0',
    });
    return `https://s.tradingview.com/widgetembed/?${query.toString()}`;
  }, [symbol, theme]);

  useEffect(() => {
    setIsLoading(true);
  }, [iframeSrc]);

  return (
    <div className={`${height} rounded-lg border border-white/10 bg-white/5 p-3 md:p-4 flex flex-col overflow-hidden`}>
      {showPrice && (
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">{coinName}/USDT</p>
            <p className="text-base md:text-lg font-semibold text-white">
              {typeof currentPrice === 'number' ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : 'Live chart'}
            </p>
          </div>
          <p className="text-[11px] text-gray-500">Candlestick + indicators</p>
        </div>
      )}

      <div className="relative flex-1 min-h-0 rounded-lg overflow-hidden border border-white/10 bg-black/20">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30">
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <Loader2 size={14} className="animate-spin" />
              Loading chart...
            </div>
          </div>
        )}

        <iframe
          key={`${symbol}-${theme}`}
          src={iframeSrc}
          title={`${coinName} chart`}
          className="h-full w-full"
          onLoad={() => setIsLoading(false)}
          loading="lazy"
          allow="clipboard-write"
        />
      </div>
    </div>
  );
});
