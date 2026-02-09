"use client";

import { useState, useMemo } from 'react';
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
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: '--', change: '--', cap: '--', volume: '--', spark: [30, 40, 35, 45, 42, 50], isUp: true, logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', price: '--', change: '--', cap: '--', volume: '--', spark: [20, 25, 23, 28, 30, 29], isUp: true, logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
  { id: 'binancecoin', name: 'BNB', symbol: 'BNB', price: '--', change: '--', cap: '--', volume: '--', spark: [22, 24, 23, 25, 27, 26], isUp: true, logo: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png' },
  { id: 'solana', name: 'Solana', symbol: 'SOL', price: '--', change: '--', cap: '--', volume: '--', spark: [18, 16, 17, 15, 14, 13], isUp: true, logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
  { id: 'ripple', name: 'XRP', symbol: 'XRP', price: '--', change: '--', cap: '--', volume: '--', spark: [12, 11, 10, 9, 10, 9], isUp: true, logo: 'https://assets.coingecko.com/coins/images/44/large/xrp.png' },
  { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', price: '--', change: '--', cap: '--', volume: '--', spark: [13, 14, 13, 15, 16, 15], isUp: true, logo: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png' },
  { id: 'cardano', name: 'Cardano', symbol: 'ADA', price: '--', change: '--', cap: '--', volume: '--', spark: [10, 12, 11, 14, 15, 16], isUp: true, logo: 'https://assets.coingecko.com/coins/images/975/large/cardano.png' },
  { id: 'tron', name: 'TRON', symbol: 'TRX', price: '--', change: '--', cap: '--', volume: '--', spark: [9, 10, 11, 12, 13, 14], isUp: true, logo: 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png' },
  { id: 'avalanche-2', name: 'Avalanche', symbol: 'AVAX', price: '--', change: '--', cap: '--', volume: '--', spark: [8, 9, 10, 11, 12, 13], isUp: true, logo: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png' },
  { id: 'chainlink', name: 'Chainlink', symbol: 'LINK', price: '--', change: '--', cap: '--', volume: '--', spark: [7, 8, 9, 10, 11, 12], isUp: true, logo: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png' },
  { id: 'shiba-inu', name: 'Shiba Inu', symbol: 'SHIB', price: '--', change: '--', cap: '--', volume: '--', spark: [6, 7, 8, 9, 10, 11], isUp: true, logo: 'https://assets.coingecko.com/coins/images/11939/large/shiba.png' },
  { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', price: '--', change: '--', cap: '--', volume: '--', spark: [11, 11, 12, 11, 12, 13], isUp: true, logo: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png' },
  { id: 'bitcoin-cash', name: 'Bitcoin Cash', symbol: 'BCH', price: '--', change: '--', cap: '--', volume: '--', spark: [10, 9, 8, 7, 6, 5], isUp: true, logo: 'https://assets.coingecko.com/coins/images/780/large/bitcoin-cash-circle.png' },
  { id: 'uniswap', name: 'Uniswap', symbol: 'UNI', price: '--', change: '--', cap: '--', volume: '--', spark: [5, 6, 7, 8, 9, 10], isUp: true, logo: 'https://assets.coingecko.com/coins/images/12504/large/uni.jpg' },
  { id: 'litecoin', name: 'Litecoin', symbol: 'LTC', price: '--', change: '--', cap: '--', volume: '--', spark: [4, 5, 6, 7, 8, 9], isUp: true, logo: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png' },
  { id: 'near', name: 'NEAR Protocol', symbol: 'NEAR', price: '--', change: '--', cap: '--', volume: '--', spark: [3, 4, 5, 6, 7, 8], isUp: true, logo: 'https://assets.coingecko.com/coins/images/10365/large/near.jpg' },
  { id: 'matic-network', name: 'Polygon', symbol: 'MATIC', price: '--', change: '--', cap: '--', volume: '--', spark: [2, 3, 4, 5, 6, 7], isUp: true, logo: 'https://assets.coingecko.com/coins/images/4713/large/polygon.png' },
  { id: 'stellar', name: 'Stellar', symbol: 'XLM', price: '--', change: '--', cap: '--', volume: '--', spark: [1, 2, 3, 4, 5, 6], isUp: true, logo: 'https://assets.coingecko.com/coins/images/100/large/Stellar_symbol_black_RGB.png' },
  { id: 'cosmos', name: 'Cosmos', symbol: 'ATOM', price: '--', change: '--', cap: '--', volume: '--', spark: [2, 4, 6, 8, 10, 12], isUp: true, logo: 'https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png' },
  { id: 'internet-computer', name: 'Internet Computer', symbol: 'ICP', price: '--', change: '--', cap: '--', volume: '--', spark: [3, 6, 9, 12, 15, 18], isUp: true, logo: 'https://assets.coingecko.com/coins/images/14495/large/Internet_Computer_logo.png' },
  { id: 'filecoin', name: 'Filecoin', symbol: 'FIL', price: '--', change: '--', cap: '--', volume: '--', spark: [4, 8, 12, 16, 20, 24], isUp: true, logo: 'https://assets.coingecko.com/coins/images/12817/large/filecoin.png' },
  { id: 'aptos', name: 'Aptos', symbol: 'APT', price: '--', change: '--', cap: '--', volume: '--', spark: [5, 10, 15, 20, 25, 30], isUp: true, logo: 'https://assets.coingecko.com/coins/images/26455/large/aptos_round.png' },
  { id: 'arbitrum', name: 'Arbitrum', symbol: 'ARB', price: '--', change: '--', cap: '--', volume: '--', spark: [6, 12, 18, 24, 30, 36], isUp: true, logo: 'https://assets.coingecko.com/coins/images/16547/large/photo_2023-03-29_21.47.00.jpeg' },
  { id: 'optimism', name: 'Optimism', symbol: 'OP', price: '--', change: '--', cap: '--', volume: '--', spark: [7, 14, 21, 28, 35, 42], isUp: true, logo: 'https://assets.coingecko.com/coins/images/25244/large/Optimism.png' },
  { id: 'hedera-hashgraph', name: 'Hedera', symbol: 'HBAR', price: '--', change: '--', cap: '--', volume: '--', spark: [8, 16, 24, 32, 40, 48], isUp: true, logo: 'https://assets.coingecko.com/coins/images/3688/large/hbar.png' },
  { id: 'algorand', name: 'Algorand', symbol: 'ALGO', price: '--', change: '--', cap: '--', volume: '--', spark: [9, 18, 27, 36, 45, 54], isUp: true, logo: 'https://assets.coingecko.com/coins/images/4380/large/download.png' },
  { id: 'vechain', name: 'VeChain', symbol: 'VET', price: '--', change: '--', cap: '--', volume: '--', spark: [10, 20, 30, 40, 50, 60], isUp: true, logo: 'https://assets.coingecko.com/coins/images/1167/large/VET_Token_Icon.png' },
  { id: 'render-token', name: 'Render', symbol: 'RNDR', price: '--', change: '--', cap: '--', volume: '--', spark: [11, 22, 33, 44, 55, 66], isUp: true, logo: 'https://assets.coingecko.com/coins/images/11636/large/rndr.png' },
  { id: 'sui', name: 'Sui', symbol: 'SUI', price: '--', change: '--', cap: '--', volume: '--', spark: [12, 24, 36, 48, 60, 72], isUp: true, logo: 'https://assets.coingecko.com/coins/images/26375/large/sui_asset.jpeg' },
  { id: 'pepe', name: 'Pepe', symbol: 'PEPE', price: '--', change: '--', cap: '--', volume: '--', spark: [13, 26, 39, 52, 65, 78], isUp: true, logo: 'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg' },
  { id: 'pax-gold', name: 'Pax Gold (Gold)', symbol: 'PAXG', price: '--', change: '--', cap: '--', volume: '--', spark: [14, 28, 42, 56, 70, 84], isUp: true, logo: 'https://assets.coingecko.com/coins/images/9519/large/paxgold.png' }
];

export default function MarketsPage() {
  const [filter, setFilter] = useState<'all' | 'gainers' | 'losers'>('all');
  const { prices, isLoading: pricesLoading } = useCoinCapPrices(markets.map((coin) => coin.id));
  
  const formatVolume = (value: number) => {
    if (!value) return '--';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const liveMarkets = useMemo(() => {
    const withPrices = markets.map((coin) => {
      const live = prices[coin.id];
      if (!live) return { ...coin, changePercent: 0 };
      return {
        ...coin,
        price: formatPrice(live.priceUsd),
        change: formatChange(live.changePercent24Hr),
        isUp: live.changePercent24Hr >= 0,
        changePercent: live.changePercent24Hr,
        cap: live.marketCap ? formatVolume(live.marketCap) : '--',
        volume: live.volume24Hr ? formatVolume(live.volume24Hr) : '--',
      };
    });

    if (filter === 'gainers') {
      return withPrices
        .filter((coin) => coin.changePercent > 0)
        .sort((a, b) => b.changePercent - a.changePercent);
    }
    
    if (filter === 'losers') {
      return withPrices
        .filter((coin) => coin.changePercent < 0)
        .sort((a, b) => a.changePercent - b.changePercent);
    }
    
    return withPrices;
  }, [prices, filter]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
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
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors ${
                filter === 'all' ? 'bg-accent text-white' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              All
            </button>
            <button 
              onClick={() => setFilter('gainers')}
              className={`px-4 py-2 rounded-lg text-sm min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors ${
                filter === 'gainers' ? 'bg-accent text-white' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              Gainers
            </button>
            <button 
              onClick={() => setFilter('losers')}
              className={`px-4 py-2 rounded-lg text-sm min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors ${
                filter === 'losers' ? 'bg-accent text-white' : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              Losers
            </button>
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
          <h2 className="text-lg font-semibold">
            {filter === 'all' && 'Top Markets'}
            {filter === 'gainers' && 'Top Gainers (24h)'}
            {filter === 'losers' && 'Top Losers (24h)'}
          </h2>
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
