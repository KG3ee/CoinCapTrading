'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Activity } from 'lucide-react';
import Image from 'next/image';
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

export default function HomePage() {
  const router = useRouter();
  
  // Quick Trade state
  const [quickTradeType, setQuickTradeType] = useState<'buy' | 'sell'>('buy');
  const [quickTradeCoin, setQuickTradeCoin] = useState('BTC');
  const [quickTradeAmount, setQuickTradeAmount] = useState<string>('');
  const [quickTradePrice, setQuickTradePrice] = useState<string>('');
  const [quickTradeLoading, setQuickTradeLoading] = useState(false);
  const [quickTradeMessage, setQuickTradeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const cryptoPrices = [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: '43,250.00', change: '+2.5', isUp: true, logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', price: '2,280.50', change: '+1.8', isUp: true, logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
    { id: 'ripple', name: 'Ripple', symbol: 'XRP', price: '0.5234', change: '-0.9', isUp: false, logo: 'https://assets.coingecko.com/coins/images/44/large/xrp.png' },
    { id: 'cardano', name: 'Cardano', symbol: 'ADA', price: '0.4567', change: '+3.2', isUp: true, logo: 'https://assets.coingecko.com/coins/images/975/large/cardano.png' },
    { id: 'solana', name: 'Solana', symbol: 'SOL', price: '98.75', change: '-1.2', isUp: false, logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
    { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', price: '6.89', change: '+0.5', isUp: true, logo: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png' },
  ];

  const { prices } = useCoinCapPrices(cryptoPrices.map((coin) => coin.id));

  const livePrices = cryptoPrices.map((coin) => {
    const live = prices[coin.id];
    if (!live) return coin;
    return {
      ...coin,
      price: formatPrice(live.priceUsd),
      change: formatChange(live.changePercent24Hr),
      isUp: live.changePercent24Hr >= 0,
    };
  });

  const recentTransactions = [
    { id: 1, type: 'Buy', coin: 'BTC', amount: '0.025', price: '$1,081.25', time: '2m ago', status: 'Completed' },
    { id: 2, type: 'Sell', coin: 'ETH', amount: '1.5', price: '$3,420.75', time: '15m ago', status: 'Completed' },
    { id: 3, type: 'Buy', coin: 'SOL', amount: '10', price: '$987.50', time: '1h ago', status: 'Pending' },
    { id: 4, type: 'Sell', coin: 'ADA', amount: '500', price: '$228.35', time: '2h ago', status: 'Completed' },
  ];

  // Quick trade handlers
  const handleQuickTrade = async () => {
    if (!quickTradeAmount || !quickTradePrice) {
      setQuickTradeMessage({ type: 'error', text: 'Please enter amount and price' });
      return;
    }

    if (parseFloat(quickTradeAmount) <= 0 || parseFloat(quickTradePrice) <= 0) {
      setQuickTradeMessage({ type: 'error', text: 'Amount and price must be greater than 0' });
      return;
    }

    setQuickTradeLoading(true);
    setQuickTradeMessage(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      if (!token) {
        setQuickTradeMessage({ type: 'error', text: 'Please login to place trades' });
        setQuickTradeLoading(false);
        return;
      }

      const response = await fetch('/api/trades/place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: quickTradeType,
          cryptoSymbol: quickTradeCoin,
          amount: parseFloat(quickTradeAmount),
          pricePerUnit: parseFloat(quickTradePrice),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setQuickTradeMessage({ type: 'error', text: data.error || 'Failed to place order' });
        return;
      }

      setQuickTradeMessage({ 
        type: 'success', 
        text: `${quickTradeType === 'buy' ? 'Buy' : 'Sell'} order placed!` 
      });

      setQuickTradeAmount('');
      setTimeout(() => {
        setQuickTradeMessage(null);
      }, 4000);

    } catch (error) {
      console.error('Trade error:', error);
      setQuickTradeMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setQuickTradeLoading(false);
    }
  };

  return (
    <div className="responsive-container max-w-7xl mx-auto space-y-2 sm:space-y-2 md:space-y-3 lg:space-y-3 pb-4 min-h-screen flex flex-col">
      {/* Price Ticker */}
      <div className="glass-card overflow-x-auto snap-x snap-mandatory">
        <div className="flex gap-2 sm:gap-3 md:gap-4 lg:gap-6 min-w-max p-2 sm:p-2 md:p-2">
          {livePrices.slice(0, 4).map((crypto) => (
            <div key={crypto.symbol} className="flex items-center gap-2 snap-start shrink-0">
              <div className="relative w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0">
                <Image
                  src={crypto.logo}
                  alt={crypto.name}
                  width={28}
                  height={28}
                  className="w-full h-full rounded-full object-cover"
                  priority={false}
                  loading="lazy"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 truncate">{crypto.symbol}</p>
                <p className="text-xs sm:text-sm font-semibold truncate">${crypto.price}</p>
              </div>
              <span className={`text-xs flex items-center gap-1 whitespace-nowrap ${crypto.isUp ? 'text-success' : 'text-danger'}`}>
                {crypto.isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {crypto.change}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2 md:gap-2">
        <div 
          className="glass-card p-3 md:p-2 cursor-pointer hover:bg-white/10 transition-colors"
          onClick={() => router.push('/wallet')}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400 truncate">Total Balance</p>
            <DollarSign size={14} className="text-accent flex-shrink-0" />
          </div>
          <p className="text-sm md:text-base font-bold truncate">$24,567.89</p>
          <p className="text-xs text-success truncate mt-0.5">+12.5%</p>
        </div>
        
        <div 
          className="glass-card p-3 md:p-2 hidden md:block cursor-pointer hover:bg-white/10 transition-colors"
          onClick={() => router.push('/trade')}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400 truncate">24h Volume</p>
            <BarChart3 size={14} className="text-purple-400 flex-shrink-0" />
          </div>
          <p className="text-sm md:text-base font-bold truncate">$8,429.12</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">15 TX</p>
        </div>
        
        <div 
          className="glass-card p-3 md:p-2 hidden md:block cursor-pointer hover:bg-white/10 transition-colors"
          onClick={() => router.push('/trade')}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400 truncate">Top Gainer</p>
            <TrendingUp size={14} className="text-success flex-shrink-0" />
          </div>
          <p className="text-sm md:text-base font-bold">ADA</p>
          <p className="text-xs text-success mt-0.5">+3.2%</p>
        </div>
        
        <div 
          className="glass-card p-3 md:p-2 hidden md:block cursor-pointer hover:bg-white/10 transition-colors"
          onClick={() => router.push('/trade')}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400 truncate">Active Orders</p>
            <Activity size={14} className="text-blue-400 flex-shrink-0" />
          </div>
          <p className="text-sm md:text-base font-bold">7</p>
          <p className="text-xs text-gray-400 mt-0.5">3 Pending</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 lg:gap-3 flex-1">
        {/* Chart Section - Full width on mobile, spans multiple col on larger screens */}
        <div className="md:col-span-2 lg:col-span-2 space-y-2 md:space-y-2 lg:space-y-2">
          {/* Trading Chart */}
          <div 
            className="glass-card p-2 sm:p-3 md:p-3 cursor-pointer hover:bg-white/10 transition-colors overflow-hidden"
            onClick={() => router.push('/trade')}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-1 sm:mb-2">
              <h2 className="text-xs sm:text-base font-semibold">BTC/USD</h2>
              <div className="flex gap-1">
                <button className="text-xs px-2 py-1 rounded bg-accent text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">1H</button>
                <button className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">24H</button>
                <button className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">7D</button>
                <button className="text-xs px-2 py-1 rounded bg-white/5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">1M</button>
              </div>
            </div>
            
            {/* TradingView Chart Placeholder */}
            <TradingViewChart coinId="bitcoin" coinName="Bitcoin" height="h-48 sm:h-56 md:h-64" />
          </div>

          {/* Market Prices - Responsive Grid */}
          <div 
            className="glass-card p-3 cursor-pointer hover:bg-white/10 transition-colors"
            onClick={() => router.push('/markets')}
          >
            <h2 className="text-sm font-semibold mb-2">Market Prices</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2">
              {livePrices.map((crypto) => (
                <div
                  key={crypto.symbol}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push('/markets');
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="relative w-8 h-8 flex-shrink-0">
                      <Image
                        src={crypto.logo}
                        alt={crypto.name}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                        priority={false}
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{crypto.symbol}</p>
                      <p className="text-xs text-gray-400 truncate">{crypto.name}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold">${crypto.price}</p>
                    <p className={`text-xs flex items-center gap-0.5 ${crypto.isUp ? 'text-success' : 'text-danger'}`}>
                      {crypto.isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {crypto.change}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Trade Section - Full width on mobile, 1/3 on desktop */}
        <div className="space-y-2 md:space-y-2 lg:space-y-2">
          {/* Buy/Sell Form */}
          <div className="glass-card p-3">
            <h2 className="text-sm font-semibold mb-2">Quick Trade</h2>

            {/* Status Message */}
            {quickTradeMessage && (
              <div className={`mb-2 p-2 rounded text-xs ${quickTradeMessage.type === 'success' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                {quickTradeMessage.text}
              </div>
            )}
            
            <div className="flex gap-1 mb-2">
              <button 
                onClick={() => setQuickTradeType('buy')}
                className={`flex-1 py-2 rounded-lg font-medium text-xs min-h-[36px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  quickTradeType === 'buy' 
                    ? 'bg-success text-white' 
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                Buy
              </button>
              <button 
                onClick={() => setQuickTradeType('sell')}
                className={`flex-1 py-2 rounded-lg font-medium text-xs min-h-[36px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  quickTradeType === 'sell' 
                    ? 'bg-danger text-white' 
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                Sell
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1 font-medium">Select Coin</label>
                <select 
                  value={quickTradeCoin}
                  onChange={(e) => setQuickTradeCoin(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-xs"
                >
                  <option>BTC</option>
                  <option>ETH</option>
                  <option>XRP</option>
                  <option>ADA</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1 font-medium">Amount</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={quickTradeAmount}
                  onChange={(e) => setQuickTradeAmount(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1 font-medium">Price (USD)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={quickTradePrice}
                  onChange={(e) => setQuickTradePrice(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-xs"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-white/10 text-xs">
                <p className="text-gray-400">Total</p>
                <p className="font-bold">${quickTradeAmount && quickTradePrice ? (parseFloat(quickTradeAmount) * parseFloat(quickTradePrice)).toFixed(2) : '0.00'}</p>
              </div>

              <button 
                onClick={handleQuickTrade}
                disabled={quickTradeLoading || !quickTradeAmount || !quickTradePrice}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-accent to-purple-500 hover:from-accent/80 hover:to-purple-500/80 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all text-xs min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {quickTradeLoading ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </div>

          {/* Order Book Preview - Hidden on smaller screens */}
          <div 
            className="glass-card p-3 hidden sm:block cursor-pointer hover:bg-white/10 transition-colors"
            onClick={() => router.push('/trade')}
          >
            <h2 className="text-xs font-semibold mb-2">Order Book</h2>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-gray-400 pb-1 border-b border-white/10">
                <span>Price</span>
                <span>Amount</span>
              </div>
              <div className="flex justify-between text-danger text-xs">
                <span>43,251.20</span>
                <span>0.125</span>
              </div>
              <div className="flex justify-between text-danger text-xs">
                <span>43,250.50</span>
                <span>0.567</span>
              </div>
              <div className="py-1 border-y border-white/10 text-center font-bold text-xs">
                43,250.00
              </div>
              <div className="flex justify-between text-success text-xs">
                <span>43,249.50</span>
                <span>0.234</span>
              </div>
              <div className="flex justify-between text-success text-xs">
                <span>43,248.80</span>
                <span>0.456</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust & Stats Section */}
      <div className="glass-card p-4 md:p-5">
        <h2 className="text-base md:text-lg font-bold mb-4">Why Choose CryptoTrade</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="text-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <p className="text-2xl md:text-3xl font-bold text-accent mb-1">150K+</p>
            <p className="text-xs md:text-sm text-gray-400">Active Users</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <p className="text-2xl md:text-3xl font-bold text-success mb-1">$2.5B+</p>
            <p className="text-xs md:text-sm text-gray-400">Trading Volume</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <p className="text-2xl md:text-3xl font-bold text-blue-400 mb-1">24/7</p>
            <p className="text-xs md:text-sm text-gray-400">Market Access</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <p className="text-2xl md:text-3xl font-bold text-purple-400 mb-1">0.1%</p>
            <p className="text-xs md:text-sm text-gray-400">Lowest Fees</p>
          </div>
        </div>
      </div>

    </div>
  );
}
