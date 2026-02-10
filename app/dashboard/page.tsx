'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  DollarSign,
  Wallet,
  ArrowLeft,
  AlertCircle,
  Plus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

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

interface DashboardData {
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

export default function DashboardPage() {
  const router = useRouter();
  const { status } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        if (status !== 'authenticated') {
          return;
        }

        const response = await fetch('/api/dashboard', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.status === 401) {
          await signOut({ redirect: false });
          router.push('/login');
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to load dashboard');
          return;
        }

        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (error) {
        console.error('Load dashboard error:', error);
        setError('An error occurred while loading your dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    loadDashboard();
  }, [router, status]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-accent border-t-transparent"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-background">
        <div className="sticky top-0 z-50 glass border-b border-white/10 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} className="text-white" />
            </button>
            <h1 className="text-white font-semibold text-lg">Trading Dashboard</h1>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="glass-card p-6 text-center">
            <p className="text-red-300 flex items-center justify-center gap-2">
              <AlertCircle size={18} />
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalGainLoss = data.portfolio.holdings.reduce((sum, h) => sum + h.gainLoss, 0);
  const totalGainLossPercent =
    data.portfolio.totalInvested > 0
      ? ((data.portfolio.totalReturns + totalGainLoss) / data.portfolio.totalInvested) * 100
      : 0;

  return (
    <div className="bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 glass border-b border-white/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} className="text-white" />
            </button>
            <h1 className="text-white font-semibold text-lg">Trading Dashboard</h1>
          </div>
          <button
            onClick={() => router.push('/trade')}
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/80 text-white font-semibold transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Trade
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Portfolio Value */}
          <div className="glass-card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Portfolio Value</p>
                <div className="flex items-center gap-2">
                  {!showBalance ? (
                    <span className="text-3xl font-bold text-white">••••••</span>
                  ) : (
                    <h2 className="text-3xl font-bold text-white">
                      ${data.portfolio.totalPortfolioValue.toFixed(2)}
                    </h2>
                  )}
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {showBalance ? (
                      <Eye size={18} className="text-gray-400" />
                    ) : (
                      <EyeOff size={18} className="text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              <DollarSign size={32} className="text-accent" />
            </div>
            <div className={`p-2 rounded inline-block ${totalGainLoss >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
              <span className="text-sm font-semibold flex items-center gap-1">
                {totalGainLoss >= 0 ? (
                  <ArrowUpRight size={16} />
                ) : (
                  <ArrowDownLeft size={16} />
                )}
                {totalGainLoss >= 0 ? '+' : ''}{totalGainLoss.toFixed(2)} ({totalGainLossPercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Account Balance */}
          <div className="glass-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Available Balance</p>
                <h2 className="text-3xl font-bold text-white">
                  ${data.portfolio.accountBalance.toFixed(2)}
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => router.push('/wallet?action=deposit')}
                    className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/80 text-white text-xs font-semibold transition-colors"
                  >
                    Deposit
                  </button>
                  <button
                    onClick={() => router.push('/wallet?action=withdraw')}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors border border-white/10"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
              <Wallet size={32} className="text-accent" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <p className="text-gray-400 text-sm mb-1">Total Invested</p>
            <p className="text-2xl font-bold text-white">${data.portfolio.totalInvested.toFixed(2)}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-gray-400 text-sm mb-1">Total Returns</p>
            <p className={`text-2xl font-bold ${data.portfolio.totalReturns >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${data.portfolio.totalReturns.toFixed(2)}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-gray-400 text-sm mb-1">Holdings</p>
            <p className="text-2xl font-bold text-white">{data.stats.totalHoldings}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-gray-400 text-sm mb-1">Total Trades</p>
            <p className="text-2xl font-bold text-white">{data.stats.totalTrades}</p>
          </div>
        </div>

        {/* Holdings */}
        {data.portfolio.holdings.length > 0 && (
          <div className="glass-card">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-accent" />
              Your Holdings
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-gray-400 py-3 px-2">Symbol</th>
                    <th className="text-right text-gray-400 py-3 px-2">Amount</th>
                    <th className="text-right text-gray-400 py-3 px-2">Avg Buy Price</th>
                    <th className="text-right text-gray-400 py-3 px-2">Current Price</th>
                    <th className="text-right text-gray-400 py-3 px-2">Total Value</th>
                    <th className="text-right text-gray-400 py-3 px-2">Gain/Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {data.portfolio.holdings.map((holding, index) => (
                    <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-2 text-white font-mono font-semibold">{holding.cryptoSymbol}</td>
                      <td className="py-3 px-2 text-right text-white">{holding.amount.toFixed(4)}</td>
                      <td className="py-3 px-2 text-right text-gray-400">${holding.averageBuyPrice.toFixed(2)}</td>
                      <td className="py-3 px-2 text-right text-white">${holding.currentPrice.toFixed(2)}</td>
                      <td className="py-3 px-2 text-right text-white font-semibold">${holding.totalValue.toFixed(2)}</td>
                      <td className={`py-3 px-2 text-right font-semibold ${holding.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${holding.gainLoss.toFixed(2)} ({holding.gainLossPercent.toFixed(2)}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Trades */}
        {data.trades.length > 0 && (
          <div className="glass-card">
            <h3 className="text-lg font-bold text-white mb-4">Recent Trades</h3>
            <div className="space-y-3">
              {data.trades.map((trade) => (
                <div key={trade._id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className={`p-2 rounded-lg ${
                        trade.type === 'buy' ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}
                    >
                      {trade.type === 'buy' ? (
                        <ArrowDownLeft
                          size={18}
                          className='text-green-400'
                        />
                      ) : (
                        <ArrowUpRight
                          size={18}
                          className='text-red-400'
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold capitalize">
                        {trade.type === 'buy' ? 'Buy' : 'Sell'} {trade.cryptoSymbol}
                      </p>
                      <p className="text-gray-400 text-sm">{trade.amount.toFixed(4)} at ${trade.pricePerUnit.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">${trade.totalValue.toFixed(2)}</p>
                    <p className="text-gray-400 text-xs">{new Date(trade.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.portfolio.holdings.length === 0 && data.trades.length === 0 && (
          <div className="glass-card text-center py-12">
            <TrendingUp size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Trades Yet</h3>
            <p className="text-gray-400 mb-6">Start trading to build your portfolio</p>
            <button
              onClick={() => router.push('/trade')}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-accent to-purple-500 hover:from-accent/80 hover:to-purple-500/80 text-white font-semibold transition-all"
            >
              Make Your First Trade
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
