"use client";

import Image from 'next/image';
import { Search, Star, TrendingDown, TrendingUp } from 'lucide-react';
import { useCoinCapPrices } from '@/lib/hooks/useCoinCapPrices';

const formatPrice = (value: number) => {
  if (Number.isNaN(value)) return '0.00';
  if (value >= 1000) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (value >= 1) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
};

const formatChange = (value: number) => {
  if (Number.isNaN(value)) return '+0.00';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
};

const marketStats = [
  { label: 'Market Cap', value: '$1.87T', change: '+2.1%', isUp: true },
  { label: '24h Volume', value: '$82.4B', change: '-1.4%', isUp: false },
  { label: 'BTC Dominance', value: '52.6%', change: '+0.3%', isUp: true },
  { label: 'Active Coins', value: '12,483', change: '+48', isUp: true },
];

const markets = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: '43,250.00', change: '+2.5', cap: '$846.2B', volume: '$28.4B', spark: [30, 40, 35, 45, 42, 50], isUp: true, logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', price: '2,280.50', change: '+1.8', cap: '$274.1B', volume: '$12.9B', spark: [20, 25, 23, 28, 30, 29], isUp: true, logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
  { id: 'solana', name: 'Solana', symbol: 'SOL', price: '98.75', change: '-1.2', cap: '$44.9B', volume: '$2.7B', spark: [18, 16, 17, 15, 14, 13], isUp: false, logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
  { id: 'cardano', name: 'Cardano', symbol: 'ADA', price: '0.4567', change: '+3.2', cap: '$16.1B', volume: '$1.1B', spark: [10, 12, 11, 14, 15, 16], isUp: true, logo: 'https://assets.coingecko.com/coins/images/975/large/cardano.png' },
  { id: 'ripple', name: 'Ripple', symbol: 'XRP', price: '0.5234', change: '-0.9', cap: '$28.7B', volume: '$1.4B', spark: [12, 11, 10, 9, 10, 9], isUp: false, logo: 'https://assets.coingecko.com/coins/images/44/large/xrp.png' },
  { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', price: '6.89', change: '+0.5', cap: '$9.6B', volume: '$0.6B', spark: [11, 11, 12, 11, 12, 13], isUp: true, logo: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png' },
];

export default function MarketsPage() {
  const { prices } = useCoinCapPrices(markets.map((coin) => coin.id));
  const liveMarkets = markets.map((coin) => {
    const live = prices[coin.id];
    if (!live) return coin;
    return {
      ...coin,
      price: formatPrice(live.priceUsd),
      change: formatChange(live.changePercent24Hr),
      isUp: live.changePercent24Hr >= 0,
    };
  });

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Markets</h1>
          <p className="text-sm text-gray-400">Track prices, volume, and market cap in real time.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search coins"
              className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none min-h-[44px]"
            />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-lg bg-accent text-white text-sm min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">All</button>
            <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Gainers</button>
            <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Losers</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {marketStats.map((stat) => (
          <div key={stat.label} className="glass-card">
            <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
            <p className="text-xl md:text-2xl font-bold">{stat.value}</p>
            <p className={`text-xs flex items-center gap-1 ${stat.isUp ? 'text-success' : 'text-danger'}`}>
              {stat.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      <div className="glass-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Top Markets</h2>
          <button className="text-xs text-gray-400 hover:text-white">View All</button>
        </div>

        <div className="md:hidden space-y-3">
          {liveMarkets.map((coin) => (
            <div key={coin.symbol} className="p-3 rounded-lg bg-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10">
                    <Image
                      src={coin.logo}
                      alt={coin.name}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                      priority={false}
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <p className="font-semibold">{coin.symbol}</p>
                    <p className="text-xs text-gray-400">{coin.name}</p>
                  </div>
                </div>
                <button className="p-2 rounded-lg hover:bg-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Add to watchlist">
                  <Star size={18} className="text-gray-400" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Price</p>
                  <p className="font-semibold">${coin.price}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">24h</p>
                  <p className={`font-semibold ${coin.isUp ? 'text-success' : 'text-danger'}`}>
                    {coin.change}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Market Cap</p>
                  <p className="font-semibold">{coin.cap}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Volume</p>
                  <p className="font-semibold">{coin.volume}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b border-white/10">
                <th className="pb-3">#</th>
                <th className="pb-3">Name</th>
                <th className="pb-3">Price</th>
                <th className="pb-3">24h</th>
                <th className="pb-3">Market Cap</th>
                <th className="pb-3">Volume (24h)</th>
                <th className="pb-3">7d</th>
                <th className="pb-3 text-right">Watch</th>
              </tr>
            </thead>
            <tbody>
              {liveMarkets.map((coin, index) => (
                <tr key={coin.symbol} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-4 text-gray-400">{index + 1}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-8">
                        <Image
                          src={coin.logo}
                          alt={coin.name}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full object-cover"
                          priority={false}
                          loading="lazy"
                        />
                      </div>
                      <div>
                        <p className="font-semibold">{coin.name}</p>
                        <p className="text-xs text-gray-400">{coin.symbol}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 font-semibold">${coin.price}</td>
                  <td className={`py-4 font-semibold ${coin.isUp ? 'text-success' : 'text-danger'}`}>
                    {coin.change}%
                  </td>
                  <td className="py-4">{coin.cap}</td>
                  <td className="py-4">{coin.volume}</td>
                  <td className="py-4">
                    <div className="flex items-end gap-1 h-8">
                      {coin.spark.map((height, idx) => (
                        <span
                          key={`${coin.symbol}-spark-${idx}`}
                          className={`w-1 rounded-sm ${coin.isUp ? 'bg-success/70' : 'bg-danger/70'}`}
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <button className="p-2 rounded-lg hover:bg-white/10 min-w-[36px] min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Add to watchlist">
                      <Star size={18} className="text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
