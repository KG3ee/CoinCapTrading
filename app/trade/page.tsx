"use client";

import { useState } from 'react';
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
  const livePriceNum = btcLive?.priceUsd || 43250;
  const liveChange = btcLive ? formatChange(btcLive.changePercent24Hr) : '+2.5';
  const isUp = btcLive ? btcLive.changePercent24Hr >= 0 : true;
  
  // Get 24h market data - all formatted consistently
  const high24h = btcLive?.high24Hr ? formatPrice(btcLive.high24Hr) : '43,980.12';
  const low24h = btcLive?.low24Hr ? formatPrice(btcLive.low24Hr) : '42,110.55';
  const volume24h = btcLive?.volume24Hr ? formatVolume(btcLive.volume24Hr) : '$28.4B';
  const marketCap = btcLive?.marketCap ? formatVolume(btcLive.marketCap) : '$850B';

  // Form state
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState<string>('');
  const [price, setPrice] = useState<string>(livePriceNum.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Calculate total
  const totalValue = amount && price ? (parseFloat(amount) * parseFloat(price)).toFixed(2) : '0.00';

  // Handle amount change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
  };

  // Handle price change
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrice(e.target.value);
  };

  // Handle percentage quick selection (25%, 50%, 75%, 100%)
  const handlePercentageClick = (percentage: number) => {
    const maxAmount = 1; // This would be wallet balance / price for buy, or holdings for sell
    const calculatedAmount = (maxAmount * percentage) / 100;
    setAmount(calculatedAmount.toFixed(4));
  };

  // Handle place order
  const handlePlaceOrder = async () => {
    // Validation
    if (!amount || !price) {
      setMessage({ type: 'error', text: 'Please enter amount and price' });
      return;
    }

    if (parseFloat(amount) <= 0 || parseFloat(price) <= 0) {
      setMessage({ type: 'error', text: 'Amount and price must be greater than 0' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Get auth token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      if (!token) {
        setMessage({ type: 'error', text: 'Please login to place trades' });
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/trades/place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: tradeType,
          cryptoSymbol: 'BTC',
          amount: parseFloat(amount),
          pricePerUnit: parseFloat(price),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to place order' });
        return;
      }

      // Success
      setMessage({ 
        type: 'success', 
        text: `${tradeType === 'buy' ? 'Buy' : 'Sell'} order placed! ID: ${data.trade.transactionId}` 
      });

      // Reset form
      setAmount('');
      setPrice(livePriceNum.toString());

      // Optionally refresh data here
      setTimeout(() => {
        setMessage(null);
      }, 5000);

    } catch (error) {
      console.error('Trade error:', error);
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-3 md:p-4 space-y-2 max-w-7xl mx-auto flex flex-col">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold">Trade</h1>
          <p className="text-xs text-gray-400">Spot trading dashboard with live order book.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs min-h-[36px] flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            BTC/USDT
            <ChevronDown size={14} />
          </button>
          <button className="px-3 py-1 rounded-lg bg-accent text-white text-xs min-h-[36px] flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <ArrowDownUp size={14} />
            Swap
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-2 flex-1">
        <div className="lg:col-span-2 space-y-2">
          <div className="glass-card p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-gray-400">BTC/USDT</p>
                <p className="text-lg font-bold">${livePrice}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">24h Change</p>
                <p className={`text-xs ${isUp ? 'text-success' : 'text-danger'}`}>{liveChange}%</p>
              </div>
            </div>
            <div className="relative w-full h-56 md:h-64 bg-black/20 rounded-lg border border-white/5 flex items-center justify-center mb-2">
              <TradingViewChart coinId="bitcoin" coinName="Bitcoin" height="h-full" showPrice={false} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="p-2 rounded-lg bg-white/5">
                <p className="text-xs text-gray-400">24h High</p>
                <p className="text-xs font-semibold">${high24h}</p>
              </div>
              <div className="p-2 rounded-lg bg-white/5">
                <p className="text-xs text-gray-400">24h Low</p>
                <p className="text-xs font-semibold">${low24h}</p>
              </div>
              <div className="p-2 rounded-lg bg-white/5">
                <p className="text-xs text-gray-400">Volume</p>
                <p className="text-xs font-semibold">{volume24h}</p>
              </div>
              <div className="p-2 rounded-lg bg-white/5">
                <p className="text-xs text-gray-400">Market Cap</p>
                <p className="text-xs font-semibold">{marketCap}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="glass-card p-3">
            {/* Status Message */}
            {message && (
              <div className={`mb-2 p-2 rounded text-xs ${message.type === 'success' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                {message.text}
              </div>
            )}

            {/* Buy/Sell Toggle */}
            <div className="flex gap-1 mb-2">
              <button 
                onClick={() => setTradeType('buy')}
                className={`flex-1 py-1.5 rounded-lg font-medium text-xs min-h-[32px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  tradeType === 'buy' 
                    ? 'bg-success text-white' 
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                Buy
              </button>
              <button 
                onClick={() => setTradeType('sell')}
                className={`flex-1 py-1.5 rounded-lg font-medium text-xs min-h-[32px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  tradeType === 'sell' 
                    ? 'bg-danger text-white' 
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                Sell
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Order Type</label>
                <button className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs min-h-[32px] flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  Limit
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
              </div>
              
              <div>
                <label className="text-xs text-gray-400 block mb-1">Price (USDT)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={price}
                  onChange={handlePriceChange}
                  className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-xs min-h-[32px]"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-400 block mb-1">Amount (BTC)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-xs min-h-[32px]"
                />
              </div>
              
              <div className="grid grid-cols-4 gap-1 text-xs">
                {[25, 50, 75, 100].map((pct) => (
                  <button 
                    key={pct}
                    onClick={() => handlePercentageClick(pct)}
                    className="py-1 rounded bg-white/5 hover:bg-white/10 text-xs min-h-[28px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              
              <div className="flex items-center justify-between text-xs border-t border-white/10 pt-2">
                <span className="text-gray-400">Est. Total</span>
                <span className="font-semibold">${totalValue}</span>
              </div>
              
              <button 
                onClick={handlePlaceOrder}
                disabled={isLoading || !amount || !price}
                className="w-full py-1.5 rounded-lg bg-gradient-to-r from-accent to-purple-500 hover:from-accent/80 hover:to-purple-500/80 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all text-xs min-h-[32px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {isLoading ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </div>

          <div className="glass-card p-3 hidden sm:block">
            <h2 className="text-sm font-semibold mb-2">Order Book</h2>
            <div className="text-xs text-gray-400 grid grid-cols-3 pb-1 border-b border-white/10 mb-1">
              <span>Price</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Total</span>
            </div>
            <div className="space-y-1">
              {orderBook.asks.slice(0, 2).map((ask, idx) => (
                <div key={`ask-${idx}`} className="grid grid-cols-3 text-danger text-xs">
                  <span>{ask.price}</span>
                  <span className="text-right text-gray-200">{ask.amount}</span>
                  <span className="text-right text-gray-400">{ask.total}</span>
                </div>
              ))}
              <div className="py-1 border-y border-white/10 text-center font-bold text-xs">{livePrice}</div>
              {orderBook.bids.slice(0, 2).map((bid, idx) => (
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
