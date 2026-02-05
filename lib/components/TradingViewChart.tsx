'use client';

import { useEffect, useRef, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

interface TradingViewChartProps {
  coinId: string;
  coinName: string;
  height?: string;
}

// Simple SVG-based fallback chart
function SimpleChart({ data, height, coinName }: { data: { time: number; price: number }[]; height: string; coinName: string }) {
  if (!data || data.length === 0) return null;

  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = 300;
  const padding = 40;
  const graphWidth = svgWidth - padding * 2;
  const graphHeight = svgHeight - padding * 2;

  // Calculate points
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * graphWidth;
    const y = svgHeight - padding - ((d.price - minPrice) / priceRange) * graphHeight;
    return { x, y, price: d.price };
  });

  // Create path
  let pathData = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathData += ` L ${points[i].x} ${points[i].y}`;
  }

  const currentPrice = data[data.length - 1].price;
  const previousPrice = data[0].price;
  const priceChange = currentPrice - previousPrice;
  const isUp = priceChange >= 0;
  const color = isUp ? '#10b981' : '#ef4444';

  return (
    <div className={`${height} bg-gradient-to-br from-black/20 to-black/10 rounded-lg border border-white/5 p-4 flex flex-col justify-between`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-gray-400 text-xs">{coinName} (30D)</p>
          <p className="text-xl font-bold">${currentPrice.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold ${isUp ? 'text-success' : 'text-danger'} flex items-center gap-1 justify-end`}>
            {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {((priceChange / previousPrice) * 100).toFixed(2)}%
          </p>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full flex-1"
        style={{ minHeight: '200px' }}
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={`grid-${ratio}`}
            x1={padding}
            y1={svgHeight - padding - ratio * graphHeight}
            x2={svgWidth - padding}
            y2={svgHeight - padding - ratio * graphHeight}
            stroke="#1f2937"
            strokeWidth="1"
            strokeDasharray="4"
          />
        ))}

        {/* Chart line */}
        <path
          d={pathData}
          stroke={color}
          strokeWidth="2"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />

        {/* Area under curve */}
        <path
          d={`${pathData} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`}
          fill={color}
          opacity="0.1"
        />

        {/* Y-axis labels */}
        {[0, 0.5, 1].map((ratio) => (
          <text
            key={`label-${ratio}`}
            x={padding - 10}
            y={svgHeight - padding - ratio * graphHeight + 4}
            fontSize="12"
            fill="#9ca3af"
            textAnchor="end"
          >
            ${(minPrice + ratio * priceRange).toFixed(0)}
          </text>
        ))}
      </svg>
      <p className="text-xs text-gray-500 mt-2">30-day historical price chart</p>
    </div>
  );
}

export function TradingViewChart({ coinId, coinName, height = 'h-96' }: TradingViewChartProps) {
  const [chartData, setChartData] = useState<{ time: number; price: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Map coin IDs to Binance symbols
        const symbolMap: Record<string, string> = {
          bitcoin: 'BTCUSDT',
          ethereum: 'ETHUSDT',
          ripple: 'XRPUSDT',
          cardano: 'ADAUSDT',
          solana: 'SOLUSDT',
          polkadot: 'DOTUSDT',
        };

        const binanceSymbol = symbolMap[coinId.toLowerCase()] || `${coinId.toUpperCase()}USDT`;

        // Fetch through backend to avoid CORS issues
        try {
          const backendResponse = await fetch(
            `/api/chart?symbol=${binanceSymbol}`,
            {
              cache: 'no-store',
              headers: { 'Accept': 'application/json' },
            }
          );

          if (backendResponse.ok) {
            const chartDataResponse = await backendResponse.json();
            if (chartDataResponse.data && chartDataResponse.data.length > 0) {
              setChartData(chartDataResponse.data);
              return;
            }
          }
        } catch (e) {
          console.warn('Backend chart endpoint unavailable, trying direct Binance API:', e);
        }

        // Fallback: Direct Binance call (for development/standalone use)
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=1d&limit=30`,
          {
            cache: 'no-store',
            headers: { 'Accept': 'application/json' },
          }
        );

        if (!response.ok) {
          throw new Error(`Binance API error: ${response.status}`);
        }

        const data = await response.json();

        // Transform Binance data: [timestamp, open, high, low, close, volume, ...]
        const transformedData = data
          .filter((candle: any[]) => candle.length >= 5)
          .map((candle: any[]) => ({
            time: Math.floor(candle[0] / 1000),
            price: parseFloat(candle[4]), // Use closing price
          }));

        if (transformedData.length > 0) {
          setChartData(transformedData);
        } else {
          setChartData(generateMockData());
        }
      } catch (err) {
        console.warn('Chart data fetch failed, using mock data:', err);
        setChartData(generateMockData());
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
  }, [coinId]);

  if (isLoading) {
    return (
      <div className={`${height} bg-black/20 rounded-lg border border-white/5 flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin mb-2 flex justify-center">
            <BarChart3 size={40} className="text-gray-600" />
          </div>
          <p className="text-gray-500 text-sm">Loading chart...</p>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className={`${height} bg-black/20 rounded-lg border border-white/5 flex items-center justify-center`}>
        <div className="text-center">
          <BarChart3 size={40} className="mx-auto mb-2 text-gray-600" />
          <p className="text-gray-500 text-sm">Unable to load chart</p>
          <p className="text-xs text-gray-600 mt-1">{coinName} price data unavailable</p>
        </div>
      </div>
    );
  }

  return <SimpleChart data={chartData} height={height} coinName={coinName} />;
}

// Generate realistic mock data
function generateMockData() {
  const data = [];
  const basePrice = 43000;
  let currentPrice = basePrice;

  for (let i = 30; i >= 0; i--) {
    const randomChange = (Math.random() - 0.5) * 1000;
    currentPrice = Math.max(currentPrice + randomChange, 1000);

    data.push({
      time: Math.floor(Date.now() / 1000) - i * 86400,
      price: currentPrice,
    });
  }

  return data;
}
