'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Activity } from 'lucide-react';
import Image from 'next/image';
import { useCoinCapPrices } from '@/lib/hooks/useCoinCapPrices';
import { TradingViewChart } from '@/lib/components/TradingViewChart';
import { useSession } from 'next-auth/react';
import TradeModal from '@/lib/components/TradeModal';
import CountdownPopup from '@/lib/components/CountdownPopup';

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
  const { status } = useSession();
  
  // Quick Trade state
  const [quickTradeCoin, setQuickTradeCoin] = useState('BTC');
  const [quickTradeType, setQuickTradeType] = useState<'buy' | 'sell'>('buy');
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [quickTradeMessage, setQuickTradeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Countdown popup state
  const [countdownOpen, setCountdownOpen] = useState(false);
  const [activeTrade, setActiveTrade] = useState<{
    tradeId: string;
    period: number;
    amount: number;
    profitPercent: number;
  } | null>(null);

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

  useEffect(() => {
    if (status === 'authenticated') {
      fetchBalance();
    }
  }, [status, fetchBalance]);
  
  const cryptoPrices = [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
    { id: 'binancecoin', name: 'BNB', symbol: 'BNB', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png' },
    { id: 'solana', name: 'Solana', symbol: 'SOL', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
    { id: 'ripple', name: 'XRP', symbol: 'XRP', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/44/large/xrp.png' },
    { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png' },
    { id: 'cardano', name: 'Cardano', symbol: 'ADA', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/975/large/cardano.png' },
    { id: 'tron', name: 'TRON', symbol: 'TRX', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png' },
    { id: 'avalanche-2', name: 'Avalanche', symbol: 'AVAX', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png' },
    { id: 'chainlink', name: 'Chainlink', symbol: 'LINK', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png' },
    { id: 'shiba-inu', name: 'Shiba Inu', symbol: 'SHIB', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/11939/large/shiba.png' },
    { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png' },
    { id: 'bitcoin-cash', name: 'Bitcoin Cash', symbol: 'BCH', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/780/large/bitcoin-cash-circle.png' },
    { id: 'uniswap', name: 'Uniswap', symbol: 'UNI', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/12504/large/uni.jpg' },
    { id: 'litecoin', name: 'Litecoin', symbol: 'LTC', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png' },
    { id: 'near', name: 'NEAR Protocol', symbol: 'NEAR', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/10365/large/near.jpg' },
    { id: 'matic-network', name: 'Polygon', symbol: 'MATIC', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/4713/large/polygon.png' },
    { id: 'stellar', name: 'Stellar', symbol: 'XLM', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/100/large/Stellar_symbol_black_RGB.png' },
    { id: 'cosmos', name: 'Cosmos', symbol: 'ATOM', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png' },
    { id: 'internet-computer', name: 'Internet Computer', symbol: 'ICP', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/14495/large/Internet_Computer_logo.png' },
    { id: 'filecoin', name: 'Filecoin', symbol: 'FIL', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/12817/large/filecoin.png' },
    { id: 'aptos', name: 'Aptos', symbol: 'APT', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/26455/large/aptos_round.png' },
    { id: 'arbitrum', name: 'Arbitrum', symbol: 'ARB', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/16547/large/photo_2023-03-29_21.47.00.jpeg' },
    { id: 'optimism', name: 'Optimism', symbol: 'OP', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/25244/large/Optimism.png' },
    { id: 'hedera-hashgraph', name: 'Hedera', symbol: 'HBAR', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/3688/large/hbar.png' },
    { id: 'algorand', name: 'Algorand', symbol: 'ALGO', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/4380/large/download.png' },
    { id: 'vechain', name: 'VeChain', symbol: 'VET', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/1167/large/VET_Token_Icon.png' },
    { id: 'render-token', name: 'Render', symbol: 'RNDR', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/11636/large/rndr.png' },
    { id: 'sui', name: 'Sui', symbol: 'SUI', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/26375/large/sui_asset.jpeg' },
    { id: 'pepe', name: 'Pepe', symbol: 'PEPE', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg' },
    { id: 'pax-gold', name: 'Pax Gold (Gold)', symbol: 'PAXG', price: '--', change: '--', isUp: true, logo: 'https://assets.coingecko.com/coins/images/9519/large/paxgold.png' },
  ];

  const { prices, isLoading: pricesLoading } = useCoinCapPrices(cryptoPrices.map((coin) => coin.id));

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

  // Open trade modal
  const openQuickTrade = (type: 'buy' | 'sell') => {
    if (status !== 'authenticated') {
      router.push('/login');
      return;
    }
    setQuickTradeType(type);
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
          type: quickTradeType,
          cryptoSymbol: quickTradeCoin,
          amount,
          period,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQuickTradeMessage({ type: 'error', text: data.error || 'Trade failed' });
        setTimeout(() => setQuickTradeMessage(null), 4000);
        return;
      }
      setWalletBalance(data.newBalance);
      setActiveTrade({ tradeId: data.trade.id, period, amount, profitPercent });
      setCountdownOpen(true);
    } catch {
      setQuickTradeMessage({ type: 'error', text: 'Network error. Please try again.' });
      setTimeout(() => setQuickTradeMessage(null), 4000);
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
    fetchBalance();
  };

  return (
    <div className="responsive-container max-w-7xl mx-auto space-y-1.5 md:space-y-2 pb-2">
      {/* Price Ticker */}
      <div className="glass-card overflow-x-auto snap-x snap-mandatory p-2">
        <div className="flex gap-2 sm:gap-2.5 md:gap-3 min-w-max">
          {livePrices.slice(0, 4).map((crypto) => (
            <div key={crypto.symbol} className="flex items-center gap-1.5 snap-start shrink-0">
              <div className="relative w-6 h-6 flex-shrink-0">
                <Image
                  src={crypto.logo}
                  alt={crypto.name}
                  width={24}
                  height={24}
                  className="w-full h-full rounded-full object-cover"
                  priority={false}
                  loading="lazy"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 truncate leading-tight">{crypto.symbol}</p>
                <p className={`text-xs font-semibold truncate leading-tight ${crypto.price === '--' ? 'animate-pulse text-gray-500' : ''}`}>${crypto.price}</p>
              </div>
              <span className={`text-xs flex items-center gap-0.5 whitespace-nowrap ${crypto.isUp ? 'text-success' : 'text-danger'}`}>
                {crypto.isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {crypto.change}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-2">
        <div 
          className="glass-card p-2 md:p-2.5 cursor-pointer hover:bg-white/10 transition-colors"
          onClick={() => router.push('/wallet')}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400 truncate">Total Balance</p>
            <DollarSign size={12} className="text-accent flex-shrink-0" />
          </div>
          <p className="text-sm font-bold truncate">$24,567.89</p>
          <p className="text-xs text-success truncate">+12.5%</p>
        </div>
        
        <div 
          className="glass-card p-2 md:p-2.5 cursor-pointer hover:bg-white/10 transition-colors"
          onClick={() => router.push('/trade')}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400 truncate">24h Volume</p>
            <BarChart3 size={12} className="text-purple-400 flex-shrink-0" />
          </div>
          <p className="text-sm font-bold truncate">$8,429.12</p>
          <p className="text-xs text-gray-400 truncate">15 TX</p>
        </div>
        
        <div 
          className="glass-card p-2 md:p-2.5 cursor-pointer hover:bg-white/10 transition-colors"
          onClick={() => router.push('/trade')}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400 truncate">Top Gainer</p>
            <TrendingUp size={12} className="text-success flex-shrink-0" />
          </div>
          <p className="text-sm font-bold">ADA</p>
          <p className="text-xs text-success">+3.2%</p>
        </div>
        
        <div 
          className="glass-card p-2 md:p-2.5 cursor-pointer hover:bg-white/10 transition-colors"
          onClick={() => router.push('/trade')}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400 truncate">Active Orders</p>
            <Activity size={12} className="text-blue-400 flex-shrink-0" />
          </div>
          <p className="text-sm font-bold">7</p>
          <p className="text-xs text-gray-400">3 Pending</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-3 lg:grid-cols-3 gap-1.5 md:gap-2">
        {/* Chart Section */}
        <div className="md:col-span-2 space-y-1.5 md:space-y-2">
          {/* Trading Chart */}
          <div 
            className="glass-card p-2 sm:p-2.5 cursor-pointer hover:bg-white/10 transition-colors overflow-hidden"
            onClick={() => router.push('/trade')}
          >
            <h2 className="text-xs sm:text-sm font-semibold mb-1.5">BTC/USD</h2>
            <TradingViewChart coinId="bitcoin" coinName="Bitcoin" height="h-40 sm:h-48 md:h-52" />
          </div>

          {/* Market Prices */}
          <div 
            className="glass-card p-2 sm:p-2.5 cursor-pointer hover:bg-white/10 transition-colors"
            onClick={() => router.push('/markets')}
          >
            <h2 className="text-xs font-semibold mb-1.5">Market Prices</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {livePrices.map((crypto) => (
                <div
                  key={crypto.symbol}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push('/markets');
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="relative w-6 h-6 flex-shrink-0">
                      <Image
                        src={crypto.logo}
                        alt={crypto.name}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full object-cover"
                        priority={false}
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{crypto.symbol}</p>
                      <p className="text-[11px] text-gray-400 truncate">{crypto.name}</p>
                    </div>
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${crypto.price === '--' ? 'animate-pulse text-gray-500' : ''}`}>${crypto.price}</p>
                    <p className={`text-[11px] flex items-center gap-0.5 ${crypto.price === '--' ? 'text-gray-500 animate-pulse' : crypto.isUp ? 'text-success' : 'text-danger'}`}>
                      {crypto.price !== '--' && (crypto.isUp ? <TrendingUp size={8} /> : <TrendingDown size={8} />)}
                      {crypto.change}{crypto.price !== '--' ? '%' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Trade Section */}
        <div className="space-y-1.5 md:space-y-2">
          {/* Buy/Sell Form */}
          <div className="glass-card p-2 sm:p-2.5">
            <h2 className="text-xs font-semibold mb-1.5">Quick Trade</h2>

            {/* Status Message */}
            {quickTradeMessage && (
              <div className={`mb-1.5 p-1.5 rounded text-xs ${quickTradeMessage.type === 'success' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                {quickTradeMessage.text}
              </div>
            )}

            <div className="space-y-1.5">
              <div>
                <label className="text-xs text-gray-400 block mb-0.5 font-medium">Select Coin</label>
                <select 
                  value={quickTradeCoin}
                  onChange={(e) => setQuickTradeCoin(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-xs"
                >
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                  <option value="XRP">XRP</option>
                  <option value="ADA">ADA</option>
                  <option value="SOL">SOL</option>
                  <option value="DOT">DOT</option>
                </select>
              </div>

              {status === 'authenticated' && (
                <div className="flex items-center justify-between py-1 border-t border-white/10 text-xs">
                  <p className="text-gray-400">Wallet Balance</p>
                  <p className="font-bold text-accent">${walletBalance.toLocaleString()} USDT</p>
                </div>
              )}

              <div className="flex gap-1.5">
                <button 
                  onClick={() => openQuickTrade('buy')}
                  className="flex-1 py-2 rounded-lg bg-success hover:bg-success/80 text-white font-semibold text-sm min-h-[36px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Buy {quickTradeCoin}
                </button>
                <button 
                  onClick={() => openQuickTrade('sell')}
                  className="flex-1 py-2 rounded-lg bg-danger hover:bg-danger/80 text-white font-semibold text-sm min-h-[36px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Sell {quickTradeCoin}
                </button>
              </div>
            </div>
          </div>

          {/* Order Book Preview */}
          <div 
            className="glass-card p-2 sm:p-2.5 cursor-pointer hover:bg-white/10 transition-colors"
            onClick={() => router.push('/trade')}
          >
            <h2 className="text-xs font-semibold mb-1.5">Order Book</h2>
            {(() => {
              const btcLive = prices['bitcoin'];
              const base = btcLive?.priceUsd || 0;
              if (!base) return (
                <div className="text-center text-xs text-gray-500 py-3 animate-pulse">Loading order book...</div>
              );
              return (
                <div className="space-y-0.5 text-xs">
                  <div className="flex justify-between text-gray-400 pb-0.5 border-b border-white/10">
                    <span>Price</span>
                    <span>Amount</span>
                  </div>
                  <div className="flex justify-between text-danger">
                    <span>{formatPrice(base + 1.20)}</span>
                    <span>0.125</span>
                  </div>
                  <div className="flex justify-between text-danger">
                    <span>{formatPrice(base + 0.50)}</span>
                    <span>0.567</span>
                  </div>
                  <div className="py-0.5 border-y border-white/10 text-center font-bold">
                    {formatPrice(base)}
                  </div>
                  <div className="flex justify-between text-success">
                    <span>{formatPrice(base - 0.50)}</span>
                    <span>0.234</span>
                  </div>
                  <div className="flex justify-between text-success">
                    <span>{formatPrice(base - 1.20)}</span>
                    <span>0.456</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Trade Modal */}
      <TradeModal
        isOpen={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
        tradeType={quickTradeType}
        cryptoSymbol={quickTradeCoin}
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
          tradeType={quickTradeType}
          cryptoSymbol={quickTradeCoin}
          onComplete={handleCountdownComplete}
          onClose={handleCountdownClose}
        />
      )}
    </div>
  );
}
