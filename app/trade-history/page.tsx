'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Clock, TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  Filter, Loader2, ArrowUpDown,
} from 'lucide-react';

interface TradeItem {
  id: string;
  type: 'buy' | 'sell';
  cryptoSymbol: string;
  amount: number;
  entryPrice: number;
  exitPrice: number;
  profitLoss: number;
  profitPercent: number;
  status: string;
  period: number | null;
  tradeKind: 'timed' | 'spot';
  transactionId: string;
  createdAt: string;
  resolvedAt: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

type FilterType = 'all' | 'timed' | 'spot';

export default function TradeHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTrades = useCallback(async (p: number, f: FilterType) => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '15' });
      if (f !== 'all') params.set('type', f);
      const res = await fetch(`/api/trades/history?${params}`);
      if (!res.ok) throw new Error('Failed to load trade history');
      const data = await res.json();
      setTrades(data.trades);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (status === 'authenticated') fetchTrades(page, filter);
  }, [status, page, filter, fetchTrades, router]);

  const handleFilterChange = (f: FilterType) => {
    setFilter(f);
    setPage(1);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-6 md:pl-20">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Clock size={18} className="text-accent" /> Trade History
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {pagination ? `${pagination.totalItems} total trades` : 'Loading...'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-gray-400" />
          {(['all', 'timed', 'spot'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-accent/15 text-accent border border-accent/30'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              {f === 'all' ? 'All Trades' : f === 'timed' ? 'Timed Trades' : 'Spot Trades'}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-danger/20 text-danger text-xs">{error}</div>
        )}

        {/* Table */}
        <div className="glass-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-accent" size={24} />
            </div>
          ) : trades.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">
              <Clock size={32} className="mx-auto mb-3 text-gray-600" />
              <p>No trades found</p>
              <p className="text-xs mt-1 text-gray-600">Your trading history will appear here</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-white/10 bg-white/[0.02]">
                      <th className="text-left py-2.5 px-3">Date</th>
                      <th className="text-left py-2.5 px-3">Type</th>
                      <th className="text-left py-2.5 px-3">Symbol</th>
                      <th className="text-right py-2.5 px-3">Amount</th>
                      <th className="text-center py-2.5 px-3">Kind</th>
                      <th className="text-center py-2.5 px-3">Status</th>
                      <th className="text-right py-2.5 px-3">P/L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map(t => (
                      <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                        <td className="py-2.5 px-3 text-gray-300">
                          <div>{new Date(t.createdAt).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleTimeString()}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`flex items-center gap-1 font-semibold ${t.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                            {t.type === 'buy' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {t.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium">{t.cryptoSymbol}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{t.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            t.tradeKind === 'timed' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {t.tradeKind === 'timed' ? `${t.period}s` : 'SPOT'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            t.status === 'win' ? 'bg-green-500/20 text-green-400' :
                            t.status === 'lose' ? 'bg-red-500/20 text-red-400' :
                            t.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {t.status.toUpperCase()}
                          </span>
                        </td>
                        <td className={`py-2.5 px-3 text-right font-mono font-semibold ${
                          t.profitLoss > 0 ? 'text-green-400' : t.profitLoss < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {t.profitLoss > 0 ? '+' : ''}{t.profitLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          {t.profitPercent !== 0 && (
                            <span className="text-xs ml-1 opacity-60">({t.profitPercent > 0 ? '+' : ''}{t.profitPercent}%)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-1 p-2">
                {trades.map(t => (
                  <div key={t.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1 text-xs font-bold ${t.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                          {t.type === 'buy' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {t.type.toUpperCase()}
                        </span>
                        <span className="text-xs font-semibold">{t.cryptoSymbol}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          t.tradeKind === 'timed' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {t.tradeKind === 'timed' ? `${t.period}s` : 'SPOT'}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        t.status === 'win' ? 'bg-green-500/20 text-green-400' :
                        t.status === 'lose' ? 'bg-red-500/20 text-red-400' :
                        t.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {t.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Amount: <span className="text-white font-mono">{t.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span></span>
                      <span className={`font-mono font-semibold ${t.profitLoss > 0 ? 'text-green-400' : t.profitLoss < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {t.profitLoss > 0 ? '+' : ''}{t.profitLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{new Date(t.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!pagination.hasPrev}
                className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum: number;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      page === pageNum
                        ? 'bg-accent text-black font-bold'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={!pagination.hasNext}
                className="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
