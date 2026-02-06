"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowDownUp, ChevronDown, TrendingDown, TrendingUp } from 'lucide-react';
import { useCoinCapPrices } from '@/lib/hooks/useCoinCapPrices';
import { TradingViewChart } from '@/lib/components/TradingViewChart';
import { AVAILABLE_CRYPTOS, ORDER_BOOK_DATA, PERCENTAGE_OPTIONS, type CryptoType } from '@/lib/constants';

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

const orderBook = ORDER_BOOK_DATA;

const recentTrades = [
  { id: 1, price: '43,250.10', amount: '0.024', time: '12:04:32', isUp: true },
  { id: 2, price: '43,249.80', amount: '0.120', time: '12:04:10', isUp: false },
  { id: 3, price: '43,250.60', amount: '0.065', time: '12:03:58', isUp: true },
  { id: 4, price: '43,249.20', amount: '0.018', time: '12:03:41', isUp: false },
  { id: 5, price: '43,250.30', amount: '0.210', time: '12:03:22', isUp: true },
];

export default function TradePage() {
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>(AVAILABLE_CRYPTOS[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const { prices } = useCoinCapPrices([selectedCrypto.id]);
  const cryptoLive = prices[selectedCrypto.id];
  
  // Memoize formatted values to prevent unnecessary recalculations
  const livePrice = useMemo(() => cryptoLive ? formatPrice(cryptoLive.priceUsd) : '0.00', [cryptoLive]);
  const livePriceNum = useMemo(() => cryptoLive?.priceUsd || 0, [cryptoLive]);
  const liveChange = useMemo(() => cryptoLive ? formatChange(cryptoLive.changePercent24Hr) : '+0.00', [cryptoLive]);
  const isUp = useMemo(() => cryptoLive ? cryptoLive.changePercent24Hr >= 0 : true, [cryptoLive]);
  
  // Get 24h market data - all formatted consistently
  const high24h = useMemo(() => cryptoLive?.high24Hr ? formatPrice(cryptoLive.high24Hr) : '0.00', [cryptoLive]);
  const low24h = useMemo(() => cryptoLive?.low24Hr ? formatPrice(cryptoLive.low24Hr) : '0.00', [cryptoLive]);
  const volume24h = useMemo(() => cryptoLive?.volume24Hr ? formatVolume(cryptoLive.volume24Hr) : '$0', [cryptoLive]);
  const marketCap = useMemo(() => cryptoLive?.marketCap ? formatVolume(cryptoLive.marketCap) : '$0', [cryptoLive]);

  // Form state
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Update price when crypto changes or live price updates
  useEffect(() => {
    if (livePriceNum > 0) {
      setPrice(livePriceNum.toString());
    }
  }, [livePriceNum, selectedCrypto.id]);

  // Calculate total with useMemo
  const totalValue = useMemo(() => {
    return amount && price ? (parseFloat(amount) * parseFloat(price)).toFixed(2) : '0.00';
  }, [amount, price]);

  // Handle crypto selection with useCallback
  const handleCryptoSelect = useCallback((crypto: CryptoType) => {
    setSelectedCrypto(crypto);
    setIsDropdownOpen(false);
    setAmount('');
  }, []);

  // Handle amount change with useCallback
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
  }, []);

  // Handle price change with useCallback
  const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPrice(e.target.value);
  }, []);

  // Handle percentage quick selection with useCallback
  const handlePercentageClick = useCallback((percentage: number) => {
    const maxAmount = 1;
    const calculatedAmount = (maxAmount * percentage) / 100;
    setAmount(calculatedAmount.toFixed(4));
  }, []);

  // Handle swap (toggle buy/sell) with useCallback
  const handleSwap = useCallback(() => {
    setTradeType(prevType => prevType === 'buy' ? 'sell' : 'buy');
  }, []);

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
          cryptoSymbol: selectedCrypto.symbol,
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
        text: `${tradeType === 'buy' ? 'Buy' : 'Sell'} order for ${selectedCrypto.symbol} placed! ID: ${data.trade.transactionId}` 
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
    <div className="min-h-screen p-2 md:p-3 space-y-1.5 max-w-7xl mx-auto flex flex-col">
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-base md:text-lg font-bold">Trade</h1>
          <p className="text-[11px] text-gray-400">Spot trading dashboard with live order book.</p>
        </div>
        <div className="flex flex-wrap gap-1.5 relative">
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] min-h-[32px] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {selectedCrypto.symbol}/USDT
              <ChevronDown size={12} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute top-full mt-1 left-0 z-20 glass-card p-1 min-w-[160px] shadow-xl border border-white/20">
                  {AVAILABLE_CRYPTOS.map((crypto) => (
                    <button
                      key={crypto.id}
                      onClick={() => handleCryptoSelect(crypto)}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-[11px] hover:bg-white/10 transition-colors ${
                        selectedCrypto.id === crypto.id ? 'bg-accent text-white' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{crypto.symbol}</span>
                        <span className="text-[10px] text-gray-400">{crypto.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          
          <button 
            onClick={handleSwap}
            className="px-2.5 py-1.5 rounded-lg bg-accent text-white text-[11px] min-h-[32px] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent hover:bg-accent/90 transition-colors"
          >
            <ArrowDownUp size={12} />
            Swap
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-1.5 flex-1">
        <div className="lg:col-span-2 space-y-1.5">
          <div className="glass-card p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <p className="text-[10px] text-gray-400">{selectedCrypto.symbol}/USDT</p>
                <p className="text-base font-bold">${livePrice}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400">24h Change</p>
                <p className={`text-[11px] ${isUp ? 'text-success' : 'text-danger'}`}>{liveChange}%</p>
              </div>
            </div>
            <div className="mb-1.5">
              <TradingViewChart coinId={selectedCrypto.id} coinName={selectedCrypto.name} height="h-48 md:h-56" showPrice={false} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
              <div className="p-1.5 rounded-lg bg-white/5">
                <p className="text-[10px] text-gray-400">24h High</p>
                <p className="text-[11px] font-semibold">${high24h}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5">
                <p className="text-[10px] text-gray-400">24h Low</p>
                <p className="text-[11px] font-semibold">${low24h}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5">
                <p className="text-[10px] text-gray-400">Volume</p>
                <p className="text-[11px] font-semibold">{volume24h}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5">
                <p className="text-[10px] text-gray-400">Market Cap</p>
                <p className="text-[11px] font-semibold">{marketCap}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="glass-card p-2.5">
            {/* Status Message */}
            {message && (
              <div className={`mb-1.5 p-1.5 rounded text-[10px] ${message.type === 'success' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                {message.text}
              </div>
            )}

            {/* Buy/Sell Toggle */}
            <div className="flex gap-1 mb-1.5">
              <button 
                onClick={() => setTradeType('buy')}
                className={`flex-1 py-1.5 rounded-lg font-medium text-[10px] min-h-[32px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  tradeType === 'buy' 
                    ? 'bg-success text-white' 
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                Buy
              </button>
              <button 
                onClick={() => setTradeType('sell')}
                className={`flex-1 py-1.5 rounded-lg font-medium text-[10px] min-h-[32px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  tradeType === 'sell' 
                    ? 'bg-danger text-white' 
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                Sell
              </button>
            </div>

            <div className="space-y-1.5">
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5">Order Type</label>
                <button className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] min-h-[32px] flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  Limit
                  <ChevronDown size={12} className="text-gray-400" />
                </button>
              </div>
              
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5">Price (USDT)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={price}
                  onChange={handlePriceChange}
                  className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-[10px] min-h-[32px]"
                />
              </div>
              
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5">Amount ({selectedCrypto.symbol})</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-[10px] min-h-[32px]"
                />
              </div>
              
              <div className="grid grid-cols-4 gap-1 text-[10px]">
                {PERCENTAGE_OPTIONS.map((pct) => (
                  <button 
                    key={pct}
                    onClick={() => handlePercentageClick(pct)}
                    className="py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] min-h-[28px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              
              <div className="flex items-center justify-between text-[10px] border-t border-white/10 pt-1.5">
                <span className="text-gray-400">Est. Total</span>
                <span className="font-semibold">${totalValue}</span>
              </div>
              
              <button 
                onClick={handlePlaceOrder}
                disabled={isLoading || !amount || !price}
                className="w-full py-1.5 rounded-lg bg-gradient-to-r from-accent to-purple-500 hover:from-accent/80 hover:to-purple-500/80 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all text-[10px] min-h-[32px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {isLoading ? 'Processing...' : `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${selectedCrypto.symbol}`}
              </button>
            </div>
          </div>

          <div className="glass-card p-2.5 hidden sm:block">
            <h2 className="text-xs font-semibold mb-1.5">Order Book</h2>
            <div className="text-[10px] text-gray-400 grid grid-cols-3 pb-0.5 border-b border-white/10 mb-0.5">
              <span>Price</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Total</span>
            </div>
            <div className="space-y-0.5">
              {orderBook.asks.slice(0, 2).map((ask, idx) => (
                <div key={`ask-${idx}`} className="grid grid-cols-3 text-danger text-[10px]">
                  <span>{ask.price}</span>
                  <span className="text-right text-gray-200">{ask.amount}</span>
                  <span className="text-right text-gray-400">{ask.total}</span>
                </div>
              ))}
              <div className="py-0.5 border-y border-white/10 text-center font-bold text-[10px]">{livePrice}</div>
              {orderBook.bids.slice(0, 2).map((bid, idx) => (
                <div key={`bid-${idx}`} className="grid grid-cols-3 text-success text-[10px]">
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
