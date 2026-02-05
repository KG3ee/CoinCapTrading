"use client";

import { ArrowDownUp, ChevronDown, TrendingDown, TrendingUp } from 'lucide-react';
import { useCoinCapPrices } from '@/lib/hooks/useCoinCapPrices';
import { TradingViewChart } from '@/lib/components/TradingViewChart';

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

const formatVolume = (value: number) => {
  if (!value) return '$0';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

const orderBook = {
  asks: [
    { price: '43,252.10', amount: '0.156', total: '6,747.33' },
    { price: '43,251.70', amount: '0.084', total: '3,632.15' },
    { price: '43,251.20', amount: '0.324', total: '14,013.38' },
    { price: '43,250.80', amount: '0.440', total: '19,030.35' },
  ],
  bids: [
    { price: '43,249.90', amount: '0.210', total: '9,082.47' },
    { price: '43,249.50', amount: '0.367', total: '15,869.57' },
    { price: '43,249.10', amount: '0.125', total: '5,406.14' },
    { price: '43,248.60', amount: '0.520', total: '22,489.27' },
  ],
};

const recentTrades = [
  { id: 1, price: '43,250.10', amount: '0.024', time: '12:04:32', isUp: true },
  { id: 2, price: '43,249.80', amount: '0.120', time: '12:04:10', isUp: false },
  { id: 3, price: '43,250.60', amount: '0.065', time: '12:03:58', isUp: true },
  { id: 4, price: '43,249.20', amount: '0.018', time: '12:03:41', isUp: false },
  { id: 5, price: '43,250.30', amount: '0.210', time: '12:03:22', isUp: true },
];

export default function TradePage() {
  const { prices } = useCoinCapPrices(['bitcoin']);
  const btcLive = prices.bitcoin;
  const livePrice = btcLive ? formatPrice(btcLive.priceUsd) : '43,250.00';
  const liveChange = btcLive ? formatChange(btcLive.changePercent24Hr) : '+2.5';
  const isUp = btcLive ? btcLive.changePercent24Hr >= 0 : true;
  
  // Get 24h market data - all formatted consistently
  const high24h = btcLive?.high24Hr ? formatPrice(btcLive.high24Hr) : '43,980.12';
  const low24h = btcLive?.low24Hr ? formatPrice(btcLive.low24Hr) : '42,110.55';
  const volume24h = btcLive?.volume24Hr ? formatVolume(btcLive.volume24Hr) : '$28.4B';
  const marketCap = btcLive?.marketCap ? formatVolume(btcLive.marketCap) : '$850B';

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trade</h1>
          <p className="text-sm text-gray-400">Spot trading dashboard with live order book.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm min-h-[44px] flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            BTC/USDT
            <ChevronDown size={16} />
          </button>
          <button className="px-4 py-2 rounded-lg bg-accent text-white text-sm min-h-[44px] flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <ArrowDownUp size={16} />
            Swap
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-400">BTC/USDT</p>
                <p className="text-2xl font-bold">${livePrice}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">24h Change</p>
                <p className={`text-sm ${isUp ? 'text-success' : 'text-danger'}`}>{liveChange}%</p>
              </div>
            </div>
            <div className="relative w-full h-[40vh] md:h-96 bg-black/20 rounded-lg border border-white/5 flex items-center justify-center">
              <TradingViewChart coinId="bitcoin" coinName="Bitcoin" height="h-full" showPrice={false} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-gray-400">24h High</p>
                <p className="font-semibold">${high24h}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-gray-400">24h Low</p>
                <p className="font-semibold">${low24h}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-gray-400">24h Volume</p>
                <p className="font-semibold">{volume24h}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-gray-400">Market Cap</p>
                <p className="font-semibold">{marketCap}</p>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Trades</h2>
              <button className="text-xs text-gray-400 hover:text-white">View All</button>
            </div>
            <div className="space-y-2">
              {recentTrades.map((trade) => (
                <div key={trade.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-white/5">
                  <div className={`flex items-center gap-2 ${trade.isUp ? 'text-success' : 'text-danger'}`}>
                    {trade.isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span className="font-semibold">{trade.price}</span>
                  </div>
                  <span className="text-gray-300">{trade.amount} BTC</span>
                  <span className="text-gray-500">{trade.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card">
            <div className="flex gap-2 mb-4">
              <button className="flex-1 py-2 rounded-lg bg-success text-white font-medium min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Buy</button>
              <button className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 font-medium min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Sell</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-2">Order Type</label>
                <button className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 min-h-[44px] flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  Limit
                  <ChevronDown size={16} className="text-gray-400" />
                </button>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-2">Price (USDT)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none min-h-[44px]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-2">Amount (BTC)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none min-h-[44px]"
                />
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {['25%', '50%', '75%', '100%'].map((pct) => (
                  <button key={pct} className="py-2 rounded bg-white/5 hover:bg-white/10 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                    {pct}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm border-t border-white/10 pt-3">
                <span className="text-gray-400">Est. Total</span>
                <span className="font-semibold">$0.00</span>
              </div>
              <button className="w-full py-3 rounded-lg bg-gradient-to-r from-accent to-purple-500 hover:from-accent/80 hover:to-purple-500/80 font-semibold transition-all min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                Place Buy Order
              </button>
            </div>
          </div>

          <div className="glass-card">
            <h2 className="text-lg font-semibold mb-3">Order Book</h2>
            <div className="text-xs text-gray-400 grid grid-cols-3 pb-2 border-b border-white/10">
              <span>Price</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Total</span>
            </div>
            <div className="space-y-2 mt-2">
              {orderBook.asks.map((ask, idx) => (
                <div key={`ask-${idx}`} className="grid grid-cols-3 text-danger text-xs">
                  <span>{ask.price}</span>
                  <span className="text-right text-gray-200">{ask.amount}</span>
                  <span className="text-right text-gray-400">{ask.total}</span>
                </div>
              ))}
              <div className="py-2 border-y border-white/10 text-center font-bold text-sm">{livePrice}</div>
              {orderBook.bids.map((bid, idx) => (
                <div key={`bid-${idx}`} className="grid grid-cols-3 text-success text-xs">
                  <span>{bid.price}</span>
                  <span className="text-right text-gray-200">{bid.amount}</span>
                  <span className="text-right text-gray-400">{bid.total}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
