"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, TrendingDown, TrendingUp, Clock, Loader2, Filter } from 'lucide-react';
import { useCoinCapPrices } from '@/lib/hooks/useCoinCapPrices';
import { TradingViewChart } from '@/lib/components/TradingViewChart';
import { AVAILABLE_CRYPTOS, type CryptoType } from '@/lib/constants';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import TradeModal from '@/lib/components/TradeModal';
import CountdownPopup from '@/lib/components/CountdownPopup';
import { getPortfolioVisibility, subscribePortfolioVisibility } from '@/lib/utils/portfolioVisibility';

interface TradeHistoryItem {
  id: string;
  type: 'buy' | 'sell';
  cryptoSymbol: string;
  amount: number;
  profitLoss: number;
  status: string;
  period: number | null;
  tradeKind: 'timed' | 'spot';
  createdAt: string;
}

type HistoryFilterType = 'all' | 'timed' | 'spot';

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

// Generate dynamic order book/trades based on live price
function generateOrderBook(basePrice: number) {
  if (!basePrice) return { asks: [], bids: [] };
  return {
    asks: [
      { price: formatPrice(basePrice + 2.10), amount: '0.156', total: formatPrice((basePrice + 2.10) * 0.156) },
      { price: formatPrice(basePrice + 1.70), amount: '0.084', total: formatPrice((basePrice + 1.70) * 0.084) },
      { price: formatPrice(basePrice + 1.20), amount: '0.324', total: formatPrice((basePrice + 1.20) * 0.324) },
      { price: formatPrice(basePrice + 0.80), amount: '0.440', total: formatPrice((basePrice + 0.80) * 0.440) },
    ],
    bids: [
      { price: formatPrice(basePrice - 0.10), amount: '0.210', total: formatPrice((basePrice - 0.10) * 0.210) },
      { price: formatPrice(basePrice - 0.50), amount: '0.367', total: formatPrice((basePrice - 0.50) * 0.367) },
      { price: formatPrice(basePrice - 0.90), amount: '0.125', total: formatPrice((basePrice - 0.90) * 0.125) },
      { price: formatPrice(basePrice - 1.40), amount: '0.520', total: formatPrice((basePrice - 1.40) * 0.520) },
    ],
  };
}

function generateRecentTrades(basePrice: number) {
  if (!basePrice) return [];
  return [
    { id: 1, price: formatPrice(basePrice + 0.10), amount: '0.024', time: '12:04:32', isUp: true },
    { id: 2, price: formatPrice(basePrice - 0.20), amount: '0.120', time: '12:04:10', isUp: false },
    { id: 3, price: formatPrice(basePrice + 0.60), amount: '0.065', time: '12:03:58', isUp: true },
    { id: 4, price: formatPrice(basePrice - 0.80), amount: '0.018', time: '12:03:41', isUp: false },
    { id: 5, price: formatPrice(basePrice + 0.30), amount: '0.210', time: '12:03:22', isUp: true },
  ];
}

export default function TradePage() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Trade modal state
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [walletBalance, setWalletBalance] = useState(0);
  const [showBalance, setShowBalance] = useState<boolean>(() => getPortfolioVisibility());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [tradeHistoryFilter, setTradeHistoryFilter] = useState<HistoryFilterType>('all');
  const [tradeHistoryLoading, setTradeHistoryLoading] = useState(false);
  const [tradeHistoryError, setTradeHistoryError] = useState('');

  // Countdown popup state
  const [countdownOpen, setCountdownOpen] = useState(false);
  const [activeTrade, setActiveTrade] = useState<{
    tradeId: string;
    period: number;
    amount: number;
    profitPercent: number;
  } | null>(null);

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch wallet balance
  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.portfolio?.accountBalance ?? 0);
      }
    } catch {}
  }, []);

  const fetchTradeHistory = useCallback(async (filter: HistoryFilterType) => {
    setTradeHistoryLoading(true);
    setTradeHistoryError('');
    try {
      const params = new URLSearchParams({ page: '1', limit: '12' });
      if (filter !== 'all') params.set('type', filter);
      const res = await fetch(`/api/trades/history?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load trade history');
      const data = await res.json();
      setTradeHistory(data.trades || []);
    } catch (error: any) {
      setTradeHistory([]);
      setTradeHistoryError(error?.message || 'Failed to load trade history');
    } finally {
      setTradeHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchBalance();
      fetchTradeHistory(tradeHistoryFilter);
    }
  }, [status, fetchBalance, fetchTradeHistory, tradeHistoryFilter]);

  useEffect(() => subscribePortfolioVisibility(setShowBalance), []);

  useEffect(() => {
    const requestedAsset = searchParams.get('asset')?.trim().toUpperCase();
    if (!requestedAsset) return;

    const match = AVAILABLE_CRYPTOS.find(
      (crypto) =>
        crypto.symbol.toUpperCase() === requestedAsset ||
        crypto.id.toUpperCase() === requestedAsset
    );
    if (match) {
      setSelectedCrypto(match);
    }
  }, [searchParams]);

  // Handle crypto selection
  const handleCryptoSelect = useCallback((crypto: CryptoType) => {
    setSelectedCrypto(crypto);
    setIsDropdownOpen(false);
    router.replace(`/trade?asset=${encodeURIComponent(crypto.symbol)}`);
  }, [router]);

  // Open trade modal
  const openTradeModal = (type: 'buy' | 'sell') => {
    setTradeType(type);
    setTradeModalOpen(true);
  };

  // Handle trade confirmation from modal
  const handleTradeConfirm = async (period: number, amount: number, profitPercent: number) => {
    setTradeModalOpen(false);

    try {
      const res = await fetch('/api/trades/timed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: tradeType,
          cryptoSymbol: selectedCrypto.symbol,
          amount,
          period,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Trade failed' });
        return;
      }

      // Update balance immediately
      setWalletBalance(data.newBalance);

      // Open countdown
      setActiveTrade({
        tradeId: data.trade.id,
        period,
        amount,
        profitPercent,
      });
      setCountdownOpen(true);
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    }
  };

  // Handle countdown complete
  const handleCountdownComplete = (result: { result: 'win' | 'lose'; profitAmount: number; newBalance: number }) => {
    setWalletBalance(result.newBalance);
  };

  // Handle countdown close
  const handleCountdownClose = () => {
    setCountdownOpen(false);
    setActiveTrade(null);
    fetchBalance(); // Refresh balance
  };

  return (
    <div className="p-2 md:p-3 space-y-1.5 max-w-7xl mx-auto">
      <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-base md:text-lg font-bold">Trade</h1>
          <p className="text-sm text-gray-400">Spot trading dashboard with live order book.</p>
        </div>
        <div className="flex flex-wrap gap-1.5 relative">
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-[var(--app-panel)] hover:bg-white/10 text-sm min-h-[32px] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
                <div className="menu-surface absolute top-full mt-1 left-0 z-[80] p-1 min-w-[160px] rounded-lg shadow-xl border border-white/20">
                  {AVAILABLE_CRYPTOS.map((crypto) => (
                    <button
                      key={crypto.id}
                      onClick={() => handleCryptoSelect(crypto)}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-sm transition-colors ${
                        selectedCrypto.id === crypto.id
                          ? 'bg-accent/20 text-accent border border-accent/30'
                          : 'bg-[var(--app-panel)] hover:bg-white/10 text-[var(--app-text)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{crypto.symbol}</span>
                        <span className="text-xs text-gray-400">{crypto.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-1.5 lg:flex-1">
        <div className="lg:col-span-2 space-y-1.5">
          <div className="glass-card p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <p className="text-xs text-gray-400">{selectedCrypto.symbol}/USDT</p>
                <p className="text-base font-bold">${livePrice}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">24h Change</p>
                <p className={`text-sm ${isUp ? 'text-success' : 'text-danger'}`}>{liveChange}%</p>
              </div>
            </div>
            <div className="mb-1.5">
              <TradingViewChart
                coinId={selectedCrypto.id}
                coinName={selectedCrypto.name}
                height="h-[300px] md:h-[360px]"
                showPrice={false}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
              <div className="p-1.5 rounded-lg bg-white/5">
                <p className="text-xs text-gray-400">24h High</p>
                <p className="text-sm font-semibold">${high24h}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5">
                <p className="text-xs text-gray-400">24h Low</p>
                <p className="text-sm font-semibold">${low24h}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5">
                <p className="text-xs text-gray-400">Volume</p>
                <p className="text-sm font-semibold">{volume24h}</p>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5">
                <p className="text-xs text-gray-400">Market Cap</p>
                <p className="text-sm font-semibold">{marketCap}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="glass-card p-2.5">
            {/* Status Message */}
            {message && (
              <div className={`mb-1.5 p-1.5 rounded text-xs ${message.type === 'success' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                {message.text}
              </div>
            )}

            {/* Wallet Balance */}
            <div className="mb-3 p-2 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-gray-400">Wallet Balance</p>
              <p className="text-base font-bold">
                {showBalance
                  ? `${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} `
                  : '•••••• '}
                <span className="text-xs text-gray-400">USDT</span>
              </p>
            </div>

            {/* Buy/Sell Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => openTradeModal('buy')}
                className="flex-1 py-3 rounded-lg bg-success hover:bg-success/80 text-white font-bold text-sm transition-colors flex items-center justify-center gap-1.5 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
              >
                <TrendingUp size={16} />
                Buy
              </button>
              <button
                onClick={() => openTradeModal('sell')}
                className="flex-1 py-3 rounded-lg bg-danger hover:bg-danger/80 text-white font-bold text-sm transition-colors flex items-center justify-center gap-1.5 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
              >
                <TrendingDown size={16} />
                Sell
              </button>
            </div>

            {/* Info */}
            <div className="mt-3 space-y-1 text-xs text-gray-400">
              <p>Select Buy or Sell to open a timed trade.</p>
              <p>Choose a period and amount, then confirm your order.</p>
            </div>
          </div>

          <div className="glass-card p-2.5 hidden sm:block">
            <h2 className="text-xs font-semibold mb-1.5">Order Book</h2>
            <div className="text-xs text-gray-400 grid grid-cols-3 pb-0.5 border-b border-white/10 mb-0.5">
              <span>Price</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Total</span>
            </div>
            {livePriceNum ? (
              <div className="space-y-0.5">
                {generateOrderBook(livePriceNum).asks.slice(0, 2).map((ask, idx) => (
                  <div key={`ask-${idx}`} className="grid grid-cols-3 text-danger text-xs">
                    <span>{ask.price}</span>
                    <span className="text-right text-gray-200">{ask.amount}</span>
                    <span className="text-right text-gray-400">{ask.total}</span>
                  </div>
                ))}
                <div className="py-0.5 border-y border-white/10 text-center font-bold text-xs">{livePrice}</div>
                {generateOrderBook(livePriceNum).bids.slice(0, 2).map((bid, idx) => (
                  <div key={`bid-${idx}`} className="grid grid-cols-3 text-success text-xs">
                    <span>{bid.price}</span>
                    <span className="text-right text-gray-200">{bid.amount}</span>
                    <span className="text-right text-gray-400">{bid.total}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-gray-500 py-3 animate-pulse">Loading...</div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-2.5 md:p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-3">
          <div>
            <h2 className="text-sm md:text-base font-bold flex items-center gap-2">
              <Clock size={16} className="text-accent" />
              Trade History
            </h2>
            <p className="text-xs text-gray-400">Latest spot and timed trades in one place.</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={12} className="text-gray-400" />
            {(['all', 'timed', 'spot'] as HistoryFilterType[]).map((filterValue) => (
              <button
                key={filterValue}
                onClick={() => setTradeHistoryFilter(filterValue)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  tradeHistoryFilter === filterValue
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                }`}
              >
                {filterValue === 'all' ? 'All' : filterValue === 'timed' ? 'Timed' : 'Spot'}
              </button>
            ))}
          </div>
        </div>

        {tradeHistoryError && (
          <div className="mb-2 p-2 rounded-lg bg-danger/20 text-danger text-xs">{tradeHistoryError}</div>
        )}

        {tradeHistoryLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="animate-spin text-accent" />
          </div>
        ) : tradeHistory.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-500">No trades found.</div>
        ) : (
          <>
            <div className="hidden md:block overflow-hidden rounded-lg border border-white/10">
              <table className="w-full text-xs">
                <thead className="bg-white/5">
                  <tr className="text-gray-400 border-b border-white/10">
                    <th className="text-left py-2 px-2.5">Date</th>
                    <th className="text-left py-2 px-2.5">Type</th>
                    <th className="text-left py-2 px-2.5">Symbol</th>
                    <th className="text-right py-2 px-2.5">Amount</th>
                    <th className="text-center py-2 px-2.5">Kind</th>
                    <th className="text-center py-2 px-2.5">Status</th>
                    <th className="text-right py-2 px-2.5">P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeHistory.map((item) => (
                    <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2 px-2.5 text-gray-300">{new Date(item.createdAt).toLocaleString()}</td>
                      <td className={`py-2 px-2.5 font-semibold ${item.type === 'buy' ? 'text-success' : 'text-danger'}`}>
                        {item.type.toUpperCase()}
                      </td>
                      <td className="py-2 px-2.5">{item.cryptoSymbol}</td>
                      <td className="py-2 px-2.5 text-right">{item.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                      <td className="py-2 px-2.5 text-center">{item.tradeKind === 'timed' ? `${item.period}s` : 'SPOT'}</td>
                      <td className="py-2 px-2.5 text-center">{item.status.toUpperCase()}</td>
                      <td className={`py-2 px-2.5 text-right font-semibold ${item.profitLoss > 0 ? 'text-success' : item.profitLoss < 0 ? 'text-danger' : 'text-gray-400'}`}>
                        {item.profitLoss > 0 ? '+' : ''}{item.profitLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-1.5">
              {tradeHistory.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-white/5 p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${item.type === 'buy' ? 'text-success' : 'text-danger'}`}>
                      {item.type.toUpperCase()} {item.cryptoSymbol}
                    </span>
                    <span className="text-[10px] text-gray-400">{item.tradeKind === 'timed' ? `${item.period}s` : 'SPOT'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{new Date(item.createdAt).toLocaleString()}</span>
                    <span className={item.profitLoss > 0 ? 'text-success' : item.profitLoss < 0 ? 'text-danger' : 'text-gray-300'}>
                      {item.profitLoss > 0 ? '+' : ''}{item.profitLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Trade Modal */}
      <TradeModal
        isOpen={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
        tradeType={tradeType}
        cryptoSymbol={selectedCrypto.symbol}
        walletBalance={walletBalance}
        onConfirm={handleTradeConfirm}
      />

      {/* Countdown Popup */}
      {activeTrade && (
        <CountdownPopup
          isOpen={countdownOpen}
          tradeId={activeTrade.tradeId}
          period={activeTrade.period}
          amount={activeTrade.amount}
          profitPercent={activeTrade.profitPercent}
          tradeType={tradeType}
          cryptoSymbol={selectedCrypto.symbol}
          onComplete={handleCountdownComplete}
          onClose={handleCountdownClose}
        />
      )}
    </div>
  );
}
