'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  BarChart3,
  TrendingDown,
  Eye,
  EyeOff,
  Loader,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { fetchRealCryptoData, formatPrice, formatLargeNumber } from '@/lib/mockCryptoData';

interface Holding {
  cryptoSymbol: string;
  amount: number;
  averageBuyPrice: number;
  currentPrice: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

interface Trade {
  _id: string;
  type: 'buy' | 'sell';
  cryptoSymbol: string;
  amount: number;
  pricePerUnit: number;
  totalValue: number;
  transactionId: string;
  createdAt: string;
}

interface WalletData {
  portfolio: {
    accountBalance: number;
    totalPortfolioValue: number;
    totalInvested: number;
    totalReturns: number;
    holdings: Holding[];
  };
  trades: Trade[];
  stats: {
    totalHoldings: number;
    totalTrades: number;
  };
}

type TabType = 'overview' | 'assets' | 'transactions';

export default function WalletPage() {
  const router = useRouter();
  const [data, setData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Calculate trading analytics
  const calculateAnalytics = (trades: Trade[]) => {
    const buyTrades = trades.filter(t => t.type === 'buy');
    const sellTrades = trades.filter(t => t.type === 'sell');
    
    const totalBuyValue = buyTrades.reduce((sum, t) => sum + t.totalValue, 0);
    const totalSellValue = sellTrades.reduce((sum, t) => sum + t.totalValue, 0);
    const totalTradingValue = totalBuyValue + totalSellValue;
    
    const avgTradeValue = trades.length > 0 ? totalTradingValue / trades.length : 0;
    const winRate = trades.length > 0 ? (sellTrades.length / trades.length) * 100 : 0;
    
    const cryptoPerformance = new Map<string, { gainLoss: number; count: number }>();
    trades.forEach(trade => {
      const key = trade.cryptoSymbol;
      const current = cryptoPerformance.get(key) || { gainLoss: 0, count: 0 };
      cryptoPerformance.set(key, {
        gainLoss: current.gainLoss + (trade.type === 'buy' ? -trade.totalValue : trade.totalValue),
        count: current.count + 1,
      });
    });
    
    let bestCrypto = '';
    let bestGainLoss = -Infinity;
    let worstCrypto = '';
    let worstGainLoss = Infinity;
    
    cryptoPerformance.forEach((value, key) => {
      if (value.gainLoss > bestGainLoss) {
        bestGainLoss = value.gainLoss;
        bestCrypto = key;
      }
      if (value.gainLoss < worstGainLoss) {
        worstGainLoss = value.gainLoss;
        worstCrypto = key;
      }
    });
    
    return {
      totalBuyValue,
      totalSellValue,
      avgTradeValue,
      winRate,
      bestCrypto,
      bestGainLoss,
      worstCrypto,
      worstGainLoss,
      buyCount: buyTrades.length,
      sellCount: sellTrades.length,
    };
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch('/api/dashboard', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          router.push('/login');
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to load wallet');
        } else {
          const dashboardData = await response.json();
          
          // Enrich holdings with real-time crypto data
          const realCryptos = await fetchRealCryptoData();
          const enrichedHoldings = dashboardData.portfolio.holdings.map((holding: Holding) => {
            const realCrypto = realCryptos.find(c => c.symbol === holding.cryptoSymbol);
            return {
              ...holding,
              currentPrice: realCrypto?.currentPrice || holding.currentPrice,
              totalValue: holding.amount * (realCrypto?.currentPrice || holding.currentPrice),
            };
          });

          setData({
            ...dashboardData,
            portfolio: {
              ...dashboardData.portfolio,
              holdings: enrichedHoldings,
            },
          });
        }
      } catch (error) {
        console.error('Error loading wallet:', error);
        setError('Failed to load wallet data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <Loader className="animate-spin text-accent mx-auto" size={40} />
            <p className="text-gray-400">Loading your wallet...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-accent hover:text-accent/80 mb-6 transition"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
          <div className="glass-card p-6 border border-red-500/30 bg-red-500/10">
            <div className="flex items-start gap-3">
              <AlertCircle size={24} className="text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Error</h2>
                <p className="text-red-400">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const analytics = calculateAnalytics(data.trades);
  const totalPortfolioValue = data.portfolio.totalPortfolioValue;
  const totalInvested = data.portfolio.totalInvested;
  const totalReturns = data.portfolio.totalReturns;
  const isPositive = totalReturns >= 0;

  // Tab styles
  const tabClass = (tab: TabType) => `
    px-4 py-3 font-semibold transition-all border-b-2
    ${activeTab === tab 
      ? 'border-accent text-accent' 
      : 'border-transparent text-gray-400 hover:text-white'
    }
  `;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Wallet</h1>
            <p className="text-gray-400">Manage your crypto assets and view trading history</p>
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            {showBalance ? (
              <Eye size={24} className="text-accent" />
            ) : (
              <EyeOff size={24} className="text-gray-400" />
            )}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Account Balance */}
          <div className="glass-card p-6 border border-white/10">
            <p className="text-gray-400 text-sm mb-2">Available Balance</p>
            <p className="text-3xl font-bold text-white">
              {showBalance ? formatPrice(data.portfolio.accountBalance) : '••••••'}
            </p>
          </div>

          {/* Portfolio Value */}
          <div className="glass-card p-6 border border-white/10">
            <p className="text-gray-400 text-sm mb-2">Total Portfolio Value</p>
            <p className="text-3xl font-bold text-white">
              {showBalance ? formatPrice(totalPortfolioValue) : '••••••'}
            </p>
            <p className="text-xs text-gray-400 mt-2">{data.stats.totalHoldings} assets</p>
          </div>

          {/* Total Returns */}
          <div className="glass-card p-6 border border-white/10">
            <p className="text-gray-400 text-sm mb-2">Total Returns</p>
            <div className="flex items-end gap-2">
              <p className={`text-3xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {showBalance ? formatPrice(totalReturns) : '••••••'}
              </p>
              {isPositive ? (
                <TrendingUp size={20} className="text-green-400 mb-1" />
              ) : (
                <TrendingDown size={20} className="text-red-400 mb-1" />
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-white/10 flex gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={tabClass('overview')}
          >
            <div className="flex items-center gap-2">
              <BarChart3 size={18} />
              Overview
            </div>
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={tabClass('assets')}
          >
            <div className="flex items-center gap-2">
              <ArrowUpRight size={18} />
              Assets
            </div>
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={tabClass('transactions')}
          >
            <div className="flex items-center gap-2">
              <ArrowDownLeft size={18} />
              Transactions
            </div>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Trading Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-4 border border-white/10">
                <p className="text-gray-400 text-sm mb-2">Total Trades</p>
                <p className="text-2xl font-bold text-white">{data.stats.totalTrades}</p>
              </div>
              <div className="glass-card p-4 border border-white/10">
                <p className="text-gray-400 text-sm mb-2">Win Rate</p>
                <p className="text-2xl font-bold text-white">{analytics.winRate.toFixed(1)}%</p>
              </div>
              <div className="glass-card p-4 border border-white/10">
                <p className="text-gray-400 text-sm mb-2">Best Performer</p>
                <p className="text-2xl font-bold text-green-400">{analytics.bestCrypto || 'N/A'}</p>
              </div>
              <div className="glass-card p-4 border border-white/10">
                <p className="text-gray-400 text-sm mb-2">Avg Trade Value</p>
                <p className="text-2xl font-bold text-white">{formatPrice(analytics.avgTradeValue)}</p>
              </div>
            </div>

            {/* Holdings Table */}
            <div className="glass-card border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Asset</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Amount</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Avg Price</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Current Price</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Total Value</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Gain/Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.portfolio.holdings.map((holding, index) => (
                      <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="px-6 py-4 font-semibold text-white">{holding.cryptoSymbol}</td>
                        <td className="px-6 py-4 text-right text-gray-300">{holding.amount.toFixed(6)}</td>
                        <td className="px-6 py-4 text-right text-gray-300">{formatPrice(holding.averageBuyPrice)}</td>
                        <td className="px-6 py-4 text-right text-gray-300">{formatPrice(holding.currentPrice)}</td>
                        <td className="px-6 py-4 text-right font-semibold text-white">{formatPrice(holding.totalValue)}</td>
                        <td className={`px-6 py-4 text-right font-semibold ${holding.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {holding.gainLoss >= 0 ? '+' : ''}{formatPrice(holding.gainLoss)} ({holding.gainLossPercent >= 0 ? '+' : ''}{holding.gainLossPercent.toFixed(2)}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-6">
            {/* Assets Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-card p-6 border border-white/10">
                <p className="text-gray-400 text-sm mb-2">Total Assets Value</p>
                <p className="text-3xl font-bold text-white">{formatPrice(data.portfolio.holdings.reduce((sum, h) => sum + h.totalValue, 0))}</p>
                <p className="text-xs text-gray-400 mt-2">{data.stats.totalHoldings} assets</p>
              </div>
              <div className="glass-card p-6 border border-white/10">
                <p className="text-gray-400 text-sm mb-2">Available Balance</p>
                <p className="text-3xl font-bold text-white">{formatPrice(data.portfolio.accountBalance)}</p>
                <p className="text-xs text-gray-400 mt-2">Ready to trade</p>
              </div>
            </div>

            {/* Assets Table */}
            <div className="glass-card border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Symbol</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Quantity</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Price</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Value</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Change 24h</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.portfolio.holdings.map((holding, index) => (
                      <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="px-6 py-4 font-semibold text-white">{holding.cryptoSymbol}</td>
                        <td className="px-6 py-4 text-right text-gray-300">{holding.amount.toFixed(6)}</td>
                        <td className="px-6 py-4 text-right text-gray-300">{formatPrice(holding.currentPrice)}</td>
                        <td className="px-6 py-4 text-right font-semibold text-white">{formatPrice(holding.totalValue)}</td>
                        <td className={`px-6 py-4 text-right font-semibold ${holding.gainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {holding.gainLossPercent >= 0 ? '+' : ''}{holding.gainLossPercent.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-4">
            {/* Transactions Table */}
            <div className="glass-card border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Asset</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Amount</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Price</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-400">Total</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-400">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.trades.slice(0, 20).map((trade) => (
                      <tr key={trade._id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {trade.type === 'buy' ? (
                              <ArrowDownLeft className="w-4 h-4 text-green-400" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-red-400" />
                            )}
                            <span className="capitalize font-semibold">{trade.type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-white">{trade.cryptoSymbol}</td>
                        <td className="px-6 py-4 text-right text-gray-300">{trade.amount.toFixed(6)}</td>
                        <td className="px-6 py-4 text-right text-gray-300">{formatPrice(trade.pricePerUnit)}</td>
                        <td className="px-6 py-4 text-right font-semibold text-white">{formatPrice(trade.totalValue)}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{new Date(trade.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
