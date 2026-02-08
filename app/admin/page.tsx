'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, RefreshCw, Users, TrendingUp, Clock, AlertCircle,
  Plus, Minus, MessageCircle, Send, Paperclip, X as XIcon,
  Trash2, LogOut, Home, Bell, Settings, BarChart3, ChevronRight,
  BadgeCheck, Eye, XCircle, CheckCircle2,
} from 'lucide-react';

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
interface UserItem { id: string; name: string; email?: string; }
interface UserBalance {
  id: string;
  name: string;
  email: string;
  uid: string;
  balance: number;
  accountStatus: 'active' | 'inactive' | 'banned';
  isVerified: boolean;
  isTwoFactorEnabled: boolean;
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  lastActiveAt?: string | null;
}
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
interface Notification {
  id: string;
  type: string;
  userId: string;
  uid: string;
  email: string;
  name: string;
  timestamp: string;
}
interface KycSubmission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userUid: string;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  address: string;
  documentType: string;
  documentNumber: string;
  documentFrontImage: string;
  documentBackImage: string | null;
  selfieImage: string;
  status: string;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}
interface AuditLog {
  id: string;
  actionType?: string;
  action: string;
  amount: number;
  reason: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  oldBalance?: number;
  newBalance?: number;
  actor?: string;
  actorName?: string;
  actorRole?: string;
  targetType?: string;
  targetId?: string;
  createdAt: string;
}
interface AdminSettingsState {
  rbacEnabled: boolean;
  roles: { name: string; permissions: string[] }[];
  security: { require2fa: boolean; ipWhitelist: string[] };
  notifications: { newUsers: boolean; largeWithdrawals: boolean; flaggedTrades: boolean };
  maintenance: { enabled: boolean; message: string };
  ui: { theme: 'dark' | 'light' };
}

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'moderator';
  uiTheme: 'dark' | 'light';
}

type AdminPermission =
  | 'view_dashboard'
  | 'manage_trades'
  | 'manage_users'
  | 'manage_financials'
  | 'manage_kyc'
  | 'manage_support'
  | 'view_logs'
  | 'manage_settings'
  | 'manage_admins';

interface OnlineAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'online' | 'idle' | 'offline';
  statusLabel: string;
  lastActiveAt: string | null;
}

interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'moderator';
  roleLabel: string;
  keyLast4: string;
  status: string;
  isRoot: boolean;
  createdByName?: string;
  createdByRole?: string;
  createdAt: string;
}

type AdminTab = 'overview' | 'trades' | 'users' | 'chat' | 'kyc' | 'settings';

const NAV_ITEMS: { key: AdminTab; label: string; icon: typeof Shield; permission: AdminPermission }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3, permission: 'view_dashboard' },
  { key: 'trades', label: 'Trade Control', icon: TrendingUp, permission: 'manage_trades' },
  { key: 'users', label: 'Accounts', icon: Users, permission: 'manage_users' },
  { key: 'kyc', label: 'KYC Verification', icon: BadgeCheck, permission: 'manage_kyc' },
  { key: 'chat', label: 'Customer Chat', icon: MessageCircle, permission: 'manage_support' },
  { key: 'settings', label: 'Settings', icon: Settings, permission: 'manage_settings' },
];

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [adminPermissions, setAdminPermissions] = useState<AdminPermission[]>([]);
  const [adminTheme, setAdminTheme] = useState<'dark' | 'light'>('dark');

  const [settings, setSettings] = useState<TradeSettingsData | null>(null);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [userBalances, setUserBalances] = useState<UserBalance[]>([]);
  const [onlineAdmins, setOnlineAdmins] = useState<OnlineAdmin[]>([]);

  const [globalMode, setGlobalMode] = useState<string>('random');
  const [winRate, setWinRate] = useState<number>(50);
  const [selectedUser, setSelectedUser] = useState('');
  const [userOverride, setUserOverride] = useState('');

  const [balanceUserId, setBalanceUserId] = useState('');
  const [balanceAction, setBalanceAction] = useState<string>('increase');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [accountActionType, setAccountActionType] = useState<'balance' | 'ban'>('balance');
  const [banReason, setBanReason] = useState('');

  const [resetUserId, setResetUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'banned'>('all');
  const [filterVerified, setFilterVerified] = useState<'all' | 'verified' | 'unverified'>('all');
  const [filterTwoFactor, setFilterTwoFactor] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [filterKyc, setFilterKyc] = useState<'all' | 'none' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [balanceReason, setBalanceReason] = useState('');
  const [accountActionMode, setAccountActionMode] = useState<'create' | 'reset'>('create');
  const [showAccountActionModal, setShowAccountActionModal] = useState(false);

  const [overrideQuery, setOverrideQuery] = useState('');

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogsOpen, setAuditLogsOpen] = useState(false);
  const [auditLogQuery, setAuditLogQuery] = useState('');

  const [adminSettings, setAdminSettings] = useState<AdminSettingsState | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [ipWhitelistInput, setIpWhitelistInput] = useState('');
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'moderator'>('admin');
  const [newAdminKey, setNewAdminKey] = useState<string | null>(null);

  const [createFullName, setCreateFullName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  const [deleteConfirmUserId, setDeleteConfirmUserId] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastSeenNotifTime, setLastSeenNotifTime] = useState<string>('');

  const [chatConversations, setChatConversations] = useState<ChatConversation[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatAttachments, setChatAttachments] = useState<{ type: 'image' | 'video'; name: string; data: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);

  // KYC state
  const [kycSubmissions, setKycSubmissions] = useState<KycSubmission[]>([]);
  const [kycCounts, setKycCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [kycFilter, setKycFilter] = useState('pending');
  const [kycViewingId, setKycViewingId] = useState<string | null>(null);
  const [kycRejectReason, setKycRejectReason] = useState('');
  const [kycShowRejectInput, setKycShowRejectInput] = useState<string | null>(null);
  const [kycImageModal, setKycImageModal] = useState<string | null>(null);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-admin-key': adminKey,
  }), [adminKey]);

  const can = useCallback((perm: AdminPermission) => (
    adminPermissions.includes(perm)
  ), [adminPermissions]);

  const visibleNavItems = adminPermissions.length > 0
    ? NAV_ITEMS.filter(item => can(item.permission))
    : NAV_ITEMS;

  // ── Data Fetching ──────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const sessionRes = await fetch('/api/admin/session', { headers: headers() });
      if (sessionRes.status === 401) { setIsAuthenticated(false); setError('Invalid admin key'); return; }
      if (!sessionRes.ok) throw new Error('Failed to authenticate');
      const sessionData = await sessionRes.json();
      const permissions: AdminPermission[] = sessionData.permissions || [];
      setAdminProfile(sessionData.admin);
      setAdminPermissions(permissions);
      setAdminTheme(sessionData.admin?.uiTheme || 'dark');
      setIsAuthenticated(true);

      const canLocal = (perm: AdminPermission) => permissions.includes(perm);

      if (canLocal('manage_trades')) {
        const res = await fetch('/api/admin/trade-settings', { headers: headers() });
        if (res.ok) {
          const data = await res.json();
          setSettings(data.settings);
          setStats(data.stats);
          setRecentTrades(data.recentTrades);
          setUsers(data.users);
          setGlobalMode(data.settings.globalMode);
          setWinRate(data.settings.winRatePercent);
        }
      }

      const tasks: Promise<void>[] = [];

      if (canLocal('manage_users') || canLocal('manage_financials') || canLocal('view_dashboard')) {
        tasks.push(
          fetch('/api/admin/balance', { headers: headers() })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.users) setUserBalances(d.users); })
        );
      }

      if (canLocal('manage_support')) {
        tasks.push(
          fetch('/api/admin/chat', { headers: headers() })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.conversations) setChatConversations(d.conversations || []); })
        );
      }

      if (canLocal('view_dashboard')) {
        tasks.push(
          fetch('/api/admin/notifications', { headers: headers() })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.notifications) setNotifications(d.notifications || []); })
        );
        tasks.push(
          fetch('/api/admin/presence', { headers: headers() })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.admins) setOnlineAdmins(d.admins || []); })
        );
      }

      if (canLocal('manage_kyc')) {
        tasks.push(
          fetch(`/api/admin/kyc?status=pending`, { headers: headers() })
            .then(r => r.ok ? r.json() : null)
            .then(kd => {
              if (kd?.submissions) {
                setKycSubmissions(kd.submissions || []);
                setKycCounts(kd.counts || { pending: 0, approved: 0, rejected: 0 });
              }
            })
        );
      }

      await Promise.all(tasks);
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [headers]);

  // Poll notifications every 15s
  useEffect(() => {
    if (!isAuthenticated || !can('view_dashboard')) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/notifications', { headers: headers() });
        if (res.ok) { const d = await res.json(); setNotifications(d.notifications || []); }
      } catch { /* silent */ }
    }, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, headers, can]);

  useEffect(() => {
    setSelectedUserIds(prev => prev.filter(id => userBalances.some(u => u.id === id)));
  }, [userBalances]);

  useEffect(() => {
    if (adminPermissions.length === 0) return;
    if (!visibleNavItems.some(item => item.key === activeTab)) {
      setActiveTab(visibleNavItems[0]?.key || 'overview');
    }
  }, [adminPermissions.length, activeTab, visibleNavItems]);

  const unreadNotifCount = notifications.filter(
    n => !lastSeenNotifTime || new Date(n.timestamp) > new Date(lastSeenNotifTime)
  ).length;

  const normalizedUserSearch = userSearch.trim().toLowerCase();
  const filteredUsers = userBalances.filter(u => {
    if (normalizedUserSearch) {
      const haystack = `${u.name || ''} ${u.email || ''} ${u.uid || ''} ${u.id || ''}`.toLowerCase();
      if (!haystack.includes(normalizedUserSearch)) {
        return false;
      }
    }
    if (filterStatus !== 'all' && u.accountStatus !== filterStatus) return false;
    if (filterVerified !== 'all' && u.isVerified !== (filterVerified === 'verified')) return false;
    if (filterTwoFactor !== 'all' && u.isTwoFactorEnabled !== (filterTwoFactor === 'enabled')) return false;
    if (filterKyc !== 'all' && u.kycStatus !== filterKyc) return false;
    return true;
  });

  const selectedUsers = userBalances.filter(u => selectedUserIds.includes(u.id));
  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.includes(u.id));
  const parsedBalanceAmount = Number(balanceAmount);
  const normalizedOverrideQuery = overrideQuery.trim().toLowerCase();
  const overrideResults = normalizedOverrideQuery
    ? users.filter(u => `${u.name} ${u.email || ''}`.toLowerCase().includes(normalizedOverrideQuery)).slice(0, 8)
    : [];
  const previewTargets = selectedUserIds.length
    ? selectedUsers
    : balanceUserId
      ? userBalances.filter(u => u.id === balanceUserId)
      : [];
  const previewRows = previewTargets.slice(0, 3).map(u => {
    let newBalance = u.balance;
    if (!Number.isNaN(parsedBalanceAmount) && parsedBalanceAmount > 0) {
      if (balanceAction === 'increase') newBalance = u.balance + parsedBalanceAmount;
      if (balanceAction === 'decrease') newBalance = Math.max(0, u.balance - parsedBalanceAmount);
      if (balanceAction === 'set') newBalance = parsedBalanceAmount;
    }
    return { id: u.id, name: u.name || u.email, oldBalance: u.balance, newBalance };
  });
  const previewMoreCount = Math.max(0, previewTargets.length - previewRows.length);
  const hasFilters = filterStatus !== 'all' || filterVerified !== 'all' || filterTwoFactor !== 'all' || filterKyc !== 'all';

  const handleMarkNotificationsRead = () => {
    if (notifications.length > 0) setLastSeenNotifTime(notifications[0].timestamp);
    setShowNotifications(false);
  };

  const handleLogin = async () => {
    if (!adminKey.trim()) return;
    await fetchData();
  };

  // ── Handlers ───────────────────────────────────────────
  const handleSaveSettings = async () => {
    if (!can('manage_trades')) {
      setError('You do not have permission to manage trades');
      return;
    }
    setError(''); setSuccess('');
    try {
      const res = await fetch('/api/admin/trade-settings', {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ globalMode, winRatePercent: winRate }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const data = await res.json();
      setSettings(data.settings);
      setSuccess('Settings saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message); }
  };

  const handleSetUserOverride = async () => {
    if (!can('manage_trades')) {
      setError('You do not have permission to manage trades');
      return;
    }
    if (!selectedUser) return;
    setError(''); setSuccess('');
    try {
      const res = await fetch('/api/admin/trade-settings', {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ userOverrides: { [selectedUser]: userOverride || null } }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const data = await res.json();
      setSettings(data.settings);
      setSelectedUser(''); setUserOverride('');
      setSuccess('User override saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message); }
  };

  const removeUserOverride = async (userId: string) => {
    if (!can('manage_trades')) {
      setError('You do not have permission to manage trades');
      return;
    }
    try {
      const res = await fetch('/api/admin/trade-settings', {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ userOverrides: { [userId]: null } }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setSettings(data.settings);
    } catch (err: any) { setError(err.message); }
  };

  const handleCreateUser = async () => {
    if (!can('manage_users')) {
      setError('You do not have permission to manage users');
      return;
    }
    if (!createFullName.trim() || !createEmail.trim() || createPassword.length < 6) return;
    setError(''); setSuccess(''); setCreatingUser(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({
          fullName: createFullName.trim(),
          email: createEmail.trim(),
          password: createPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSuccess(`User created: ${data.user?.email || createEmail.trim()}`);
      setCreateFullName(''); setCreateEmail(''); setCreatePassword(''); setShowCreatePassword(false);
      fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) { setError(err.message); }
    setCreatingUser(false);
  };

  const fetchAuditLogs = useCallback(async (type: 'balance' | 'all' = 'balance') => {
    if (!isAuthenticated || !can('view_logs')) return;
    setAuditLogsLoading(true);
    try {
      const res = await fetch(`/api/admin/audit?type=${type}`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch { /* silent */ }
    setAuditLogsLoading(false);
  }, [headers, isAuthenticated, can]);

  const fetchAdminSettings = useCallback(async () => {
    if (!isAuthenticated || !can('manage_settings')) return;
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/admin/settings', { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setAdminSettings(data.settings);
        setIpWhitelistInput((data.settings?.security?.ipWhitelist || []).join('\n'));
      }
    } catch { /* silent */ }
    setSettingsLoading(false);
  }, [headers, isAuthenticated, can]);

  const fetchAdminUsers = useCallback(async () => {
    if (!isAuthenticated || !can('manage_admins')) return;
    setAdminUsersLoading(true);
    try {
      const res = await fetch('/api/admin/admin-users', { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data.admins || []);
      }
    } catch { /* silent */ }
    setAdminUsersLoading(false);
  }, [headers, isAuthenticated, can]);

  const handleCreateAdmin = async () => {
    if (!newAdminName.trim() || !newAdminEmail.trim()) return;
    setError(''); setSuccess('');
    try {
      const res = await fetch('/api/admin/admin-users', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ name: newAdminName.trim(), email: newAdminEmail.trim(), role: newAdminRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create admin');
      setNewAdminKey(data.adminKey || null);
      setNewAdminName(''); setNewAdminEmail('');
      fetchAdminUsers();
      setSuccess('Admin account created');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/admin/admin-users?adminId=${adminId}`, {
        method: 'DELETE', headers: headers(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete admin');
      fetchAdminUsers();
      setSuccess('Admin deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleThemeChange = async (theme: 'dark' | 'light') => {
    setAdminTheme(theme);
    try {
      await fetch('/api/admin/session', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ uiTheme: theme }),
      });
    } catch { /* silent */ }
  };

  const handleSaveAdminSettings = async () => {
    if (!adminSettings) return;
    setError(''); setSuccess('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({
          rbacEnabled: adminSettings.rbacEnabled,
          roles: adminSettings.roles,
          security: {
            require2fa: adminSettings.security.require2fa,
            ipWhitelist: ipWhitelistInput.split('\n').map(v => v.trim()).filter(Boolean),
          },
          notifications: adminSettings.notifications,
          maintenance: adminSettings.maintenance,
          ui: adminSettings.ui,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      const savedWhitelist = ipWhitelistInput.split('\n').map(v => v.trim()).filter(Boolean);
      setAdminSettings(s => s ? { ...s, security: { ...s.security, ipWhitelist: savedWhitelist } } : s);
      setSuccess('Settings saved');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };


  const handleRevokeApiKey = async (id: string) => {
    setError(''); setSuccess('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'DELETE', headers: headers(),
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke API key');
      setSuccess('API key revoked');
      fetchAdminSettings();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'settings') {
      if (can('manage_settings')) fetchAdminSettings();
      if (can('view_logs')) fetchAuditLogs('all');
      if (can('manage_admins')) fetchAdminUsers();
    }
  }, [activeTab, fetchAdminSettings, fetchAuditLogs, fetchAdminUsers, can]);

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredUsers.map(u => u.id));
      setSelectedUserIds(prev => prev.filter(id => !filteredIds.has(id)));
      return;
    }
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      filteredUsers.forEach(u => next.add(u.id));
      return Array.from(next);
    });
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds(prev => (
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    ));
  };

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterVerified('all');
    setFilterTwoFactor('all');
    setFilterKyc('all');
  };

  const handleAdjustBalance = async () => {
    if (!can('manage_financials')) {
      setError('You do not have permission to modify balances');
      return;
    }
    const targetIds = selectedUserIds.length > 0 ? selectedUserIds : (balanceUserId ? [balanceUserId] : []);
    if (!targetIds.length || !balanceAmount || !balanceReason.trim()) return;
    setError(''); setSuccess('');
    try {
      const res = await fetch('/api/admin/balance', {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({
          userId: selectedUserIds.length ? undefined : balanceUserId,
          userIds: selectedUserIds.length ? selectedUserIds : undefined,
          action: balanceAction,
          amount: Number(balanceAmount),
          reason: balanceReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      if (data.updated && data.updated.length === 1) {
        setSuccess(`Balance: ${data.updated[0].oldBalance.toLocaleString()} \u2192 ${data.updated[0].newBalance.toLocaleString()} USDT`);
      } else {
        setSuccess(data.message || `Balance updated for ${data.updated?.length || 0} users`);
      }
      setBalanceAmount('');
      setBalanceReason('');
      if (selectedUserIds.length) {
        setSelectedUserIds([]);
      }
      setBalanceUserId('');
      setShowAccountActionModal(false);
      if (auditLogsOpen) {
        fetchAuditLogs('balance');
      }
      const balRes = await fetch('/api/admin/balance', { headers: headers() });
      if (balRes.ok) { const d = await balRes.json(); setUserBalances(d.users); }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message); }
  };

  const handleBanUsers = async () => {
    if (!can('manage_users')) {
      setError('You do not have permission to ban users');
      return;
    }
    const targetIds = selectedUserIds.length > 0 ? selectedUserIds : (balanceUserId ? [balanceUserId] : []);
    if (!targetIds.length || banReason.trim().length < 3) return;
    setError(''); setSuccess('');
    try {
      for (const id of targetIds) {
        const res = await fetch('/api/admin/ban', {
          method: 'PUT', headers: headers(),
          body: JSON.stringify({ userId: id, reason: banReason.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to ban user');
      }
      setSuccess(`Banned ${targetIds.length} user${targetIds.length > 1 ? 's' : ''}`);
      setBanReason('');
      setSelectedUserIds([]);
      setBalanceUserId('');
      setShowAccountActionModal(false);
      const balRes = await fetch('/api/admin/balance', { headers: headers() });
      if (balRes.ok) { const d = await balRes.json(); setUserBalances(d.users); }
      if (auditLogsOpen) fetchAuditLogs('balance');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message); }
  };

  const handleResetPassword = async () => {
    if (!can('manage_users')) {
      setError('You do not have permission to manage users');
      return;
    }
    if (!resetUserId || !newPassword) return;
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError(''); setSuccess('');
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ userId: resetUserId, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSuccess(data.message); setNewPassword(''); setResetUserId('');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) { setError(err.message); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!can('manage_users')) {
      setError('You do not have permission to manage users');
      return;
    }
    setError(''); setSuccess('');
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE', headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSuccess(data.message); setDeleteConfirmUserId(null);
      fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) { setError(err.message); }
  };

  // ── Chat ───────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/chat', { headers: headers() });
      if (r.ok) { const d = await r.json(); setChatConversations(d.conversations || []); }
    } catch { /* silent */ }
  }, [headers]);

  const fetchChatMessages = useCallback(async (userId: string) => {
    try {
      const r = await fetch(`/api/admin/chat?userId=${userId}`, { headers: headers() });
      if (r.ok) {
        const d = await r.json();
        setChatMessages(d.messages || []);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    } catch { /* silent */ }
  }, [headers]);

  const openChat = (userId: string) => {
    setActiveChatUser(userId);
    setChatMessages([]); setChatInput(''); setChatAttachments([]);
    fetchChatMessages(userId);
  };

  const sendAdminMessage = async () => {
    if (!activeChatUser || (!chatInput.trim() && chatAttachments.length === 0) || chatSending) return;
    setChatSending(true);
    try {
      const r = await fetch('/api/admin/chat', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ userId: activeChatUser, text: chatInput.trim(), attachments: chatAttachments }),
      });
      if (r.ok) { setChatInput(''); setChatAttachments([]); fetchChatMessages(activeChatUser); fetchConversations(); }
    } catch { /* silent */ }
    setChatSending(false);
  };

  const deleteChatMessage = async (messageId: string) => {
    try {
      const r = await fetch(`/api/admin/chat?messageId=${messageId}`, { method: 'DELETE', headers: headers() });
      if (r.ok) setChatMessages(prev => prev.filter(m => m._id !== messageId));
    } catch { /* silent */ }
  };

  const deleteConversation = async (userId: string) => {
    if (!confirm('Delete entire conversation?')) return;
    try {
      const r = await fetch(`/api/admin/chat?userId=${userId}`, { method: 'DELETE', headers: headers() });
      if (r.ok) { setActiveChatUser(null); fetchConversations(); }
    } catch { /* silent */ }
  };

  const handleChatFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return; }
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) { alert('Images/videos only'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        setChatAttachments(prev =>
          prev.length >= 3 ? prev : [...prev, { type: isImage ? 'image' : 'video', name: file.name, data: reader.result as string }]
        );
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  useEffect(() => {
    if (!activeChatUser || !isAuthenticated) return;
    const interval = setInterval(() => fetchChatMessages(activeChatUser), 4000);
    return () => clearInterval(interval);
  }, [activeChatUser, isAuthenticated, fetchChatMessages]);

  // ── KYC ────────────────────────────────────────────────
  const fetchKycSubmissions = useCallback(async (status?: string) => {
    try {
      const filter = status || kycFilter;
      const r = await fetch(`/api/admin/kyc?status=${filter}`, { headers: headers() });
      if (r.ok) {
        const d = await r.json();
        setKycSubmissions(d.submissions || []);
        setKycCounts(d.counts || { pending: 0, approved: 0, rejected: 0 });
      }
    } catch { /* silent */ }
  }, [headers, kycFilter]);

  const handleKycAction = async (kycId: string, action: 'approve' | 'reject', reason?: string) => {
    setError(''); setSuccess('');
    try {
      const r = await fetch('/api/admin/kyc', {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ kycId, action, rejectionReason: reason }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setSuccess(d.message);
      setKycViewingId(null);
      setKycShowRejectInput(null);
      setKycRejectReason('');
      fetchKycSubmissions();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError(err.message); }
  };

  // ══════════════════════════════════════════════════════
  // LOGIN SCREEN
  // ══════════════════════════════════════════════════════
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen admin-theme ${adminTheme === 'light' ? 'light' : ''} bg-[var(--admin-bg)] flex items-center justify-center p-4`}>
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
            onChange={e => setAdminKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Admin secret key"
            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none text-sm"
          />
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-accent hover:bg-accent/80 font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Access Admin Panel'}
          </button>
        </div>
      </div>
    );
  }

  const chatUnread = chatConversations.reduce((s, c) => s + c.unreadCount, 0);

  // ══════════════════════════════════════════════════════
  // MAIN ADMIN PANEL
  // ══════════════════════════════════════════════════════
  return (
    <div className={`h-screen admin-theme ${adminTheme === 'light' ? 'light' : ''} bg-[var(--admin-bg)] flex overflow-hidden`}>
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden md:flex md:flex-col w-56 border-r border-[var(--admin-border)] admin-panel flex-shrink-0">
        <div className="p-4 border-b border-[var(--admin-border)] flex items-center gap-2">
          <Shield size={20} className="text-accent" />
          <h1 className="text-sm font-bold">Admin Panel</h1>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {visibleNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            const badge = item.key === 'chat' && chatUnread > 0 ? chatUnread
              : item.key === 'kyc' && kycCounts.pending > 0 ? kycCounts.pending : 0;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive ? 'bg-accent/15 text-accent font-semibold' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={16} />
                <span className="flex-1 text-left">{item.label}</span>
                {badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-danger text-[9px] text-white font-bold">{badge}</span>
                )}
                {isActive && <ChevronRight size={14} className="text-accent/50" />}
              </button>
            );
          })}
        </nav>
        <div className="p-2 border-t border-[var(--admin-border)] space-y-1">
          <a href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <Home size={14} /> Back to Site
          </a>
          <button
            onClick={() => { setIsAuthenticated(false); setAdminKey(''); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--admin-border)] admin-panel flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-1.5 rounded-lg hover:bg-white/10"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </button>
            <h2 className="text-sm font-semibold">
              {visibleNavItems.find(n => n.key === activeTab)?.label || 'Admin'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Bell size={16} />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-danger text-[8px] text-white font-bold flex items-center justify-center">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-1 w-80 max-h-96 overflow-y-auto bg-[var(--admin-panel)] border border-[var(--admin-border)] rounded-xl shadow-2xl z-50">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--admin-border)]">
                    <p className="text-xs font-semibold">Notifications</p>
                    <button onClick={handleMarkNotificationsRead} className="text-[10px] text-accent hover:underline">
                      Mark all read
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="p-4 text-xs text-gray-500 text-center">No notifications</p>
                  ) : (
                    notifications.slice(0, 20).map(n => {
                      const isUnread = !lastSeenNotifTime || new Date(n.timestamp) > new Date(lastSeenNotifTime);
                      return (
                        <div key={n.id} className={`px-3 py-2.5 border-b border-white/5 ${isUnread ? 'bg-accent/5' : ''}`}>
                          <div className="flex items-start gap-2">
                            <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${isUnread ? 'bg-accent' : 'bg-gray-600'}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium">New user registered</p>
                              <p className="text-[10px] text-gray-400 truncate">{n.name} ({n.email})</p>
                              <p className="text-[9px] text-gray-500 mt-0.5">
                                UID: {n.uid} &middot; {new Date(n.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            <button onClick={fetchData} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Refresh">
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <a href="/" className="md:hidden p-2 rounded-lg hover:bg-white/10">
              <Home size={14} />
            </a>
          </div>
        </header>

        {/* Mobile Nav Dropdown */}
        {mobileNavOpen && (
          <div className="md:hidden bg-[var(--admin-panel)] border-b border-[var(--admin-border)] p-2 space-y-0.5">
            {visibleNavItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => { setActiveTab(item.key); setMobileNavOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm ${
                    activeTab === item.key ? 'bg-accent/15 text-accent font-semibold' : 'text-gray-400'
                  }`}
                >
                  <Icon size={16} /> {item.label}
                  {item.key === 'chat' && chatUnread > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 rounded-full bg-danger text-[9px] text-white font-bold">{chatUnread}</span>
                  )}
                  {item.key === 'kyc' && kycCounts.pending > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 rounded-full bg-orange-500 text-[9px] text-white font-bold">{kycCounts.pending}</span>
                  )}
                </button>
              );
            })}
            <button
              onClick={() => { setIsAuthenticated(false); setAdminKey(''); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-danger"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-hidden p-3">
          <div className="h-full flex flex-col gap-3">
            {error && <div className="p-2.5 rounded-lg bg-danger/20 text-danger text-xs">{error}</div>}
            {success && <div className="p-2.5 rounded-lg bg-success/20 text-success text-xs">{success}</div>}
            <div className="flex-1 min-h-0 overflow-hidden">

          {/* ── TAB: OVERVIEW ─────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="h-full flex flex-col gap-3">
              {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 flex-shrink-0">
                  {[
                    { label: 'Total Trades', value: stats.totalTrades, color: 'text-white' },
                    { label: 'Pending', value: stats.pendingTrades, color: 'text-yellow-400' },
                    { label: 'Wins', value: stats.wins, color: 'text-green-400' },
                    { label: 'Losses', value: stats.losses, color: 'text-red-400' },
                  ].map(s => (
                    <div key={s.label} className="glass-card p-2.5 text-center">
                      <p className="text-[10px] text-gray-400 mb-0.5">{s.label}</p>
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 flex-shrink-0">
                <div className="glass-card p-2.5 text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">Registered Users</p>
                  <p className="text-xl font-bold text-accent">{userBalances.length}</p>
                </div>
                <div className="glass-card p-2.5 text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">Open Chats</p>
                  <p className="text-xl font-bold text-purple-400">{chatConversations.length}</p>
                </div>
                <div className="glass-card p-2.5 text-center col-span-2 lg:col-span-1">
                  <p className="text-[10px] text-gray-400 mb-0.5">Current Mode</p>
                  <p className="text-sm font-bold capitalize">
                    {settings?.globalMode?.replace('_', ' ') || '\u2014'}
                  </p>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-3 flex-1 min-h-0">
                {/* Recent Registrations */}
                <div className="glass-card p-3 flex flex-col min-h-0 h-[220px] md:h-[260px]">
                  <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                    <Bell size={12} className="text-accent" /> Recent Registrations
                  </h3>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No recent registrations</p>
                  ) : (
                    <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
                      {notifications.slice(0, 10).map(n => (
                        <div key={n.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-[11px]">
                          <div className="min-w-0">
                            <span className="font-medium">{n.name}</span>
                            <span className="text-gray-400 ml-1.5 truncate">{n.email}</span>
                          </div>
                          <span className="text-[9px] text-gray-500 flex-shrink-0">{new Date(n.timestamp).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Online Admins */}
                <div className="glass-card p-3 flex flex-col min-h-0 h-[220px] md:h-[260px]">
                  <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                    <Shield size={12} className="text-accent" /> Online Admins
                  </h3>
                  {onlineAdmins.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No active admins</p>
                  ) : (
                    <div className="space-y-1.5 flex-1 overflow-y-auto pr-1 text-[11px]">
                      {onlineAdmins.slice(0, 10).map(a => (
                        <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${
                                a.status === 'online' ? 'bg-green-400' :
                                a.status === 'idle' ? 'bg-yellow-400' : 'bg-gray-500'
                              }`} />
                              <span className="font-medium truncate">{a.name}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 truncate">{a.role} · {a.email}</p>
                          </div>
                          <div className="text-[9px] text-gray-500 text-right">
                            <div>{a.statusLabel}</div>
                            {a.lastActiveAt && (
                              <div>{new Date(a.lastActiveAt).toLocaleTimeString()}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Trades */}
                <div className="glass-card p-3 flex flex-col min-h-0 h-[220px] md:h-[260px]">
                  <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                    <Clock size={12} className="text-accent" /> Recent Trades
                  </h3>
                  {recentTrades.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No trades yet</p>
                  ) : (
                    <div className="flex-1 overflow-y-auto pr-1">
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="text-gray-400 border-b border-white/10">
                              <th className="text-left py-1 px-2">User</th>
                              <th className="text-left py-1 px-2">Type</th>
                              <th className="text-left py-1 px-2">Symbol</th>
                              <th className="text-right py-1 px-2">Amount</th>
                              <th className="text-center py-1 px-2">Result</th>
                              <th className="text-right py-1 px-2">Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentTrades.slice(0, 12).map(t => (
                              <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                                <td className="py-1 px-2 truncate max-w-[100px]">{t.user}</td>
                                <td className={`py-1 px-2 font-semibold ${t.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                                  {t.type.toUpperCase()}
                                </td>
                                <td className="py-1 px-2">{t.cryptoSymbol}</td>
                                <td className="py-1 px-2 text-right">{t.amount.toLocaleString()}</td>
                                <td className="py-1 px-2 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                                    t.result === 'win' ? 'bg-green-500/20 text-green-400' :
                                    t.result === 'lose' ? 'bg-red-500/20 text-red-400' :
                                    'bg-yellow-500/20 text-yellow-400'
                                  }`}>
                                    {t.result.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-1 px-2 text-right text-gray-400">
                                  {new Date(t.createdAt).toLocaleTimeString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: TRADE CONTROL ────────────────────── */}
          {activeTab === 'trades' && (
            <div className="h-full flex flex-col gap-3">
              <div className="grid md:grid-cols-2 gap-3 flex-shrink-0">
                {/* Global Mode */}
                <div className="glass-card p-3 space-y-2 h-[200px] md:h-[260px] flex flex-col">
                  <h3 className="text-xs font-bold flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-accent" /> Global Trade Mode
                  </h3>
                  <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                    {[
                      { value: 'random', label: 'Random', desc: 'Uses win rate % below' },
                      { value: 'all_win', label: 'All Win', desc: 'Every trade wins' },
                      { value: 'all_lose', label: 'All Lose', desc: 'Every trade loses' },
                    ].map(mode => (
                      <label
                        key={mode.value}
                        className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                          globalMode === mode.value ? 'border-accent bg-accent/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <input
                          type="radio" name="globalMode" value={mode.value}
                          checked={globalMode === mode.value}
                          onChange={e => setGlobalMode(e.target.value)}
                          className="accent-accent"
                        />
                        <div>
                          <p className="text-xs font-medium">{mode.label}</p>
                          <p className="text-[10px] text-gray-400">{mode.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {globalMode === 'random' && (
                    <div>
                      <label className="text-[10px] text-gray-400 mb-1 block">
                        Win Rate: <span className="text-white font-bold">{winRate}%</span>
                      </label>
                      <input
                        type="range" min={0} max={100} value={winRate}
                        onChange={e => setWinRate(Number(e.target.value))}
                        className="w-full accent-accent"
                      />
                      <div className="flex justify-between text-[9px] text-gray-500">
                        <span>0% (lose)</span><span>100% (win)</span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleSaveSettings}
                    className="w-full py-2 rounded-lg bg-accent hover:bg-accent/80 font-semibold text-xs transition-colors"
                  >
                    Save Settings
                  </button>
                </div>

                {/* User Overrides */}
                <div className="glass-card p-3 space-y-2 h-[200px] md:h-[260px] flex flex-col">
                  <h3 className="text-xs font-bold flex items-center gap-1.5">
                    <Users size={12} className="text-accent" /> User Overrides
                  </h3>
                  <p className="text-[10px] text-gray-400">Type to search a user and set override.</p>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        value={overrideQuery}
                        onChange={e => { setOverrideQuery(e.target.value); setSelectedUser(''); }}
                        placeholder="Search name, email, or UID"
                        className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs focus:border-accent focus:outline-none"
                      />
                      {overrideResults.length > 0 && overrideQuery.trim() && !selectedUser && (
                        <div className="absolute z-10 mt-1 w-full max-h-32 overflow-y-auto rounded-lg border border-[var(--admin-border)] bg-[var(--admin-panel)] shadow-xl">
                          {overrideResults.map(u => (
                            <button
                              key={u.id}
                              onClick={() => { setSelectedUser(u.id); setOverrideQuery(u.name); }}
                              className="w-full px-2 py-1.5 text-left text-xs hover:bg-white/10"
                            >
                              <div className="font-medium">{u.name}</div>
                              {u.email && <div className="text-[9px] text-gray-400">{u.email}</div>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <select
                      value={userOverride} onChange={e => setUserOverride(e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs focus:border-accent focus:outline-none"
                    >
                      <option value="">Auto</option>
                      <option value="win">Win</option>
                      <option value="lose">Lose</option>
                    </select>
                    <button
                      onClick={handleSetUserOverride} disabled={!selectedUser}
                      className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/80 text-xs font-semibold disabled:opacity-50"
                    >
                      Set
                    </button>
                  </div>
                  {selectedUser && (
                    <div className="text-[10px] text-gray-500">
                      Selected: {users.find(u => u.id === selectedUser)?.name || selectedUser}
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto pr-1">
                    {settings && Object.keys(settings.userOverrides).length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-400 font-semibold">Active:</p>
                        {Object.entries(settings.userOverrides).map(([uid, ov]) => (
                          <div key={uid} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-xs">
                            <span>{users.find(u => u.id === uid)?.name || uid}</span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                ov === 'win' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {ov.toUpperCase()}
                              </span>
                              <button onClick={() => removeUserOverride(uid)} className="text-gray-400 hover:text-danger text-[10px] underline">
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-500 italic">No overrides</p>
                    )}
                  </div>
                </div>
              </div>

              {/* All Trades Table */}
              <div className="glass-card p-3 flex flex-col flex-1 min-h-0">
                <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5">
                  <Clock size={12} className="text-accent" /> All Timed Trades
                </h3>
                {recentTrades.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No trades yet</p>
                ) : (
                  <div className="flex-1 overflow-y-auto pr-1">
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="text-gray-400 border-b border-white/10">
                            <th className="text-left py-1 px-2">User</th>
                            <th className="text-left py-1 px-2">Type</th>
                            <th className="text-left py-1 px-2">Symbol</th>
                            <th className="text-right py-1 px-2">Amount</th>
                            <th className="text-center py-1 px-2">Period</th>
                            <th className="text-center py-1 px-2">Result</th>
                            <th className="text-right py-1 px-2">Profit</th>
                            <th className="text-right py-1 px-2">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentTrades.map(t => (
                            <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                              <td className="py-1 px-2 truncate max-w-[100px]">{t.user}</td>
                              <td className={`py-1 px-2 font-semibold ${t.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                                {t.type.toUpperCase()}
                              </td>
                              <td className="py-1 px-2">{t.cryptoSymbol}</td>
                              <td className="py-1 px-2 text-right">{t.amount.toLocaleString()}</td>
                              <td className="py-1 px-2 text-center">{t.period}s</td>
                              <td className="py-1 px-2 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                                  t.result === 'win' ? 'bg-green-500/20 text-green-400' :
                                  t.result === 'lose' ? 'bg-red-500/20 text-red-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {t.result.toUpperCase()}
                                </span>
                              </td>
                              <td className={`py-1 px-2 text-right ${t.result === 'win' ? 'text-green-400' : ''}`}>
                                {t.result === 'win' ? `+${t.profitAmount.toLocaleString()}` : '\u2014'}
                              </td>
                              <td className="py-1 px-2 text-right text-gray-400">
                                {new Date(t.createdAt).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: USER MANAGEMENT ──────────────────── */}
          {activeTab === 'users' && (
            <div className="h-full flex flex-col gap-3">
              {/* Account Actions */}
              <div className="glass-card p-3 space-y-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold flex items-center gap-1.5">
                    <Users size={12} className="text-accent" /> Account Actions
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAccountActionMode('create')}
                      className={`px-2 py-1 rounded text-[10px] font-semibold ${accountActionMode === 'create' ? 'bg-accent/20 text-accent' : 'bg-white/5 text-gray-400'}`}
                    >
                      Create User
                    </button>
                    <button
                      onClick={() => setAccountActionMode('reset')}
                      className={`px-2 py-1 rounded text-[10px] font-semibold ${accountActionMode === 'reset' ? 'bg-accent/20 text-accent' : 'bg-white/5 text-gray-400'}`}
                    >
                      Reset Password
                    </button>
                  </div>
                </div>
                {accountActionMode === 'create' ? (
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-[10px] text-gray-400 mb-0.5">Full Name</label>
                      <input
                        type="text"
                        value={createFullName}
                        onChange={e => setCreateFullName(e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5"
                      />
                    </div>
                    <div className="flex-1 min-w-[160px]">
                      <label className="block text-[10px] text-gray-400 mb-0.5">Email</label>
                      <input
                        type="email"
                        value={createEmail}
                        onChange={e => setCreateEmail(e.target.value)}
                        placeholder="jane@example.com"
                        className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5"
                      />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-[10px] text-gray-400 mb-0.5">Password</label>
                      <div className="relative">
                        <input
                          type={showCreatePassword ? 'text' : 'password'}
                          value={createPassword}
                          onChange={e => setCreatePassword(e.target.value)}
                          placeholder="Min 6 chars"
                          className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5 pr-14"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCreatePassword(!showCreatePassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 hover:text-white"
                        >
                          {showCreatePassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleCreateUser}
                      disabled={creatingUser || !createFullName.trim() || !createEmail.trim() || createPassword.length < 6}
                      className="px-3 py-1.5 bg-accent text-black text-xs font-bold rounded disabled:opacity-40"
                    >
                      {creatingUser ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-[10px] text-gray-400 mb-0.5">User</label>
                      <select
                        value={resetUserId} onChange={e => setResetUserId(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5"
                      >
                        <option value="">Select user</option>
                        {filteredUsers.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.name || u.email} ({u.email}) {u.uid ? `- ${u.uid}` : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-[10px] text-gray-400 mb-0.5">New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Min 6 chars"
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
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded disabled:opacity-40"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>

              {/* Account Search */}
              <div className="glass-card p-3 flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold flex items-center gap-1.5">
                    <Users size={12} className="text-accent" /> Account Search
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setBalanceAction('increase'); setBalanceReason(''); setShowAccountActionModal(true); }}
                      className="px-2 py-1 rounded bg-accent/20 text-accent text-[10px] font-semibold"
                    >
                      Account Action
                    </button>
                    {hasFilters && (
                      <button
                        onClick={clearFilters}
                        className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1"
                      >
                        <XIcon size={10} /> Clear Filters
                      </button>
                    )}
                    {userSearch && (
                      <button
                        onClick={() => setUserSearch('')}
                        className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1"
                      >
                        <XIcon size={10} /> Clear Search
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] text-gray-400 mb-0.5">Search users</label>
                  <input
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search by name, email, or UID"
                    className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">Status</label>
                      <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value as any)}
                        className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5"
                      >
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="banned">Banned</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">Verified</label>
                      <select
                        value={filterVerified}
                        onChange={e => setFilterVerified(e.target.value as any)}
                        className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5"
                      >
                        <option value="all">All</option>
                        <option value="verified">Verified</option>
                        <option value="unverified">Unverified</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">2FA</label>
                      <select
                        value={filterTwoFactor}
                        onChange={e => setFilterTwoFactor(e.target.value as any)}
                        className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5"
                      >
                        <option value="all">All</option>
                        <option value="enabled">Enabled</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">KYC</label>
                      <select
                        value={filterKyc}
                        onChange={e => setFilterKyc(e.target.value as any)}
                        className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5"
                      >
                        <option value="all">All</option>
                        <option value="none">None</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                  {(userSearch || hasFilters) && (
                    <p className="text-[10px] text-gray-500">
                      Matching users: {filteredUsers.length}
                    </p>
                  )}
                  {selectedUserIds.length > 0 && (
                    <p className="text-[10px] text-gray-500">
                      Selected: {selectedUserIds.length}
                    </p>
                  )}
                </div>

                {userBalances.length > 0 && (
                  <div className="flex-1 min-h-0 overflow-y-auto mt-2 pr-1">
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-800">
                            <th className="text-left py-1.5 pr-2">
                              <input
                                type="checkbox"
                                aria-label="Select all filtered users"
                                checked={allFilteredSelected}
                                onChange={toggleSelectAll}
                                className="h-3 w-3"
                              />
                            </th>
                            <th className="text-left py-1.5 pr-2">User</th>
                            <th className="text-left py-1.5 pr-2">Email</th>
                            <th className="text-left py-1.5 pr-2">UID</th>
                            <th className="text-left py-1.5 pr-2">Status</th>
                            <th className="text-right py-1.5 pr-2">Balance</th>
                            <th className="text-center py-1.5">Quick</th>
                            <th className="text-center py-1.5">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map(u => (
                            <tr key={u.id} className="border-b border-gray-800/50 hover:bg-white/5">
                              <td className="py-2 pr-2">
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${u.name || u.email}`}
                                  checked={selectedUserIds.includes(u.id)}
                                  onChange={() => toggleSelectUser(u.id)}
                                  className="h-3 w-3"
                                />
                              </td>
                              <td className="py-2 pr-2 font-medium">{u.name || '\u2014'}</td>
                              <td className="py-2 pr-2 text-gray-400">{u.email}</td>
                              <td className="py-2 pr-2 text-gray-400 font-mono">{u.uid || '\u2014'}</td>
                              <td className="py-2 pr-2">
                                <div className="flex flex-wrap gap-1">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                                    u.accountStatus === 'active' ? 'bg-green-500/20 text-green-400' :
                                    u.accountStatus === 'inactive' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-red-500/20 text-red-400'
                                  }`}>
                                    {u.accountStatus}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                                    u.isVerified ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-300'
                                  }`}>
                                    {u.isVerified ? 'Verified' : 'Unverified'}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                                    u.isTwoFactorEnabled ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-500/20 text-gray-300'
                                  }`}>
                                    {u.isTwoFactorEnabled ? '2FA' : 'No 2FA'}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                                    u.kycStatus === 'approved' ? 'bg-green-500/20 text-green-400' :
                                    u.kycStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                    u.kycStatus === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                    'bg-gray-500/20 text-gray-300'
                                  }`}>
                                    {u.kycStatus.toUpperCase()}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 pr-2 text-right font-mono text-accent">{u.balance.toLocaleString()}</td>
                              <td className="py-2 text-center">
                                <div className="flex gap-1 justify-center">
                                  <button
                                    onClick={() => {
                                      setSelectedUserIds([]);
                                      setBalanceUserId(u.id);
                                      setBalanceAction('increase');
                                      setBalanceAmount('1000');
                                      setBalanceReason('');
                                      setShowAccountActionModal(true);
                                    }}
                                    className="p-1 rounded bg-green-900/40 text-green-400 hover:bg-green-900/70" title="+1000"
                                  >
                                    <Plus size={12} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedUserIds([]);
                                      setBalanceUserId(u.id);
                                      setBalanceAction('decrease');
                                      setBalanceAmount('1000');
                                      setBalanceReason('');
                                      setShowAccountActionModal(true);
                                    }}
                                    className="p-1 rounded bg-red-900/40 text-red-400 hover:bg-red-900/70" title="-1000"
                                  >
                                    <Minus size={12} />
                                  </button>
                                </div>
                              </td>
                              <td className="py-2 text-center">
                                {deleteConfirmUserId === u.id ? (
                                  <div className="flex items-center gap-1 justify-center">
                                    <button
                                      onClick={() => handleDeleteUser(u.id)}
                                      className="px-2 py-0.5 rounded bg-danger text-white text-[10px] font-bold hover:bg-red-500"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirmUserId(null)}
                                      className="px-2 py-0.5 rounded bg-white/10 text-gray-400 text-[10px]"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeleteConfirmUserId(u.id)}
                                    className="p-1 rounded bg-red-900/30 text-red-400 hover:bg-red-900/60" title="Delete"
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
                  </div>
                )}

                {/* Audit Logs */}
                <details
                  className="mt-2 border-t border-white/10 pt-2"
                  open={auditLogsOpen}
                  onToggle={(e) => {
                    const open = (e.currentTarget as HTMLDetailsElement).open;
                    setAuditLogsOpen(open);
                    if (open) fetchAuditLogs('balance');
                  }}
                >
                  <summary className="text-[11px] text-gray-400 cursor-pointer select-none">
                    Account Action Logs
                  </summary>
                  <div className="mt-2 max-h-40 overflow-y-auto pr-1 text-[10px]">
                    {auditLogsLoading ? (
                      <p className="text-gray-500">Loading logs...</p>
                    ) : auditLogs.length === 0 ? (
                      <p className="text-gray-500">No logs yet</p>
                    ) : (
                      <div className="space-y-1">
                        {auditLogs.map(log => (
                          <div key={log.id} className="flex items-center justify-between p-2 rounded bg-white/5">
                            <div className="min-w-0">
                              <p className="font-semibold truncate">
                                {log.userName || log.userEmail || log.userId}
                              </p>
                              <p className="text-gray-400 truncate">
                                {log.action.toUpperCase()} {Number(log.amount || 0).toLocaleString()} &middot; {log.reason}
                                {log.oldBalance !== undefined && log.newBalance !== undefined && (
                                  <span className="ml-2 text-[9px] text-gray-500">
                                    {Number(log.oldBalance).toLocaleString()} → {Number(log.newBalance).toLocaleString()}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="text-[9px] text-gray-500 text-right flex-shrink-0">
                              <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                              <div>{new Date(log.createdAt).toLocaleTimeString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              </div>
            </div>
          )}

          {/* ── TAB: CHAT ─────────────────────────────── */}
          {activeTab === 'chat' && (
            <div className="glass-card p-3 flex flex-col h-full min-h-0">
              <div className="flex items-center justify-between flex-shrink-0">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <MessageCircle size={14} className="text-accent" /> Customer Chat
                  {chatUnread > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-danger text-[9px] text-white font-bold">{chatUnread}</span>
                  )}
                </h3>
                <button onClick={fetchConversations} className="text-[10px] text-gray-400 hover:text-white">
                  <RefreshCw size={12} />
                </button>
              </div>

              {activeChatUser ? (
                <>
                  <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 flex-shrink-0 mt-2">
                    <div>
                      <p className="text-xs font-bold">
                        {chatConversations.find(c => c.userId === activeChatUser)?.userName || 'User'}
                      </p>
                      <p className="text-[9px] text-gray-400">
                        {chatConversations.find(c => c.userId === activeChatUser)?.userEmail}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => deleteConversation(activeChatUser)}
                        className="text-[10px] text-danger px-2 py-1 rounded bg-danger/10"
                      >
                        Delete All
                      </button>
                      <button
                        onClick={() => { setActiveChatUser(null); fetchConversations(); }}
                        className="text-[10px] text-gray-400 px-2 py-1 rounded bg-white/5"
                      >
                        &larr; Back
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto space-y-2 bg-black/20 rounded-lg p-3 mt-2">
                    {chatMessages.length === 0 ? (
                      <p className="text-[10px] text-gray-500 text-center mt-8">No messages</p>
                    ) : (
                      chatMessages.map(msg => (
                        <div key={msg._id} className={`group flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`relative max-w-[75%] rounded-lg px-2.5 py-1.5 space-y-1 ${
                            msg.sender === 'admin' ? 'bg-accent/20 rounded-br-sm' : 'bg-white/10 rounded-bl-sm'
                          }`}>
                            <button
                              onClick={() => deleteChatMessage(msg._id)}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-danger/80 text-white items-center justify-center text-[8px] hidden group-hover:flex hover:bg-danger"
                            >
                              &times;
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

                  {chatAttachments.length > 0 && (
                    <div className="flex gap-1.5 flex-shrink-0 mt-2">
                      {chatAttachments.map((att, i) => (
                        <div key={i} className="relative w-12 h-12 rounded overflow-hidden bg-white/5">
                          {att.type === 'image' ? (
                            <img src={att.data} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">VID</div>
                          )}
                          <button
                            onClick={() => setChatAttachments(p => p.filter((_, idx) => idx !== i))}
                            className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-danger text-white flex items-center justify-center"
                          >
                            <XIcon size={8} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-1.5 items-end flex-shrink-0 mt-2">
                    <button
                      onClick={() => chatFileRef.current?.click()}
                      className="p-1.5 rounded bg-white/5 text-gray-400 hover:text-white"
                    >
                      <Paperclip size={14} />
                    </button>
                    <input ref={chatFileRef} type="file" accept="image/*,video/*" multiple onChange={handleChatFile} className="hidden" />
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAdminMessage(); } }}
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
              ) : chatConversations.length === 0 ? (
                <p className="text-[10px] text-gray-500 italic">No conversations yet</p>
              ) : (
                <div className="space-y-1 flex-1 min-h-0 overflow-y-auto mt-2 pr-1">
                  {chatConversations.map(c => (
                    <button
                      key={c.userId}
                      onClick={() => openChat(c.userId)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium truncate">{c.userName}</p>
                          {c.unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-danger text-[9px] text-white font-bold">{c.unreadCount}</span>
                          )}
                        </div>
                        <p className="text-[9px] text-gray-400 truncate">{c.userEmail}</p>
                        <p className="text-[10px] text-gray-500 truncate mt-0.5">
                          {c.lastSender === 'admin' ? 'You: ' : ''}{c.lastMessage}
                        </p>
                      </div>
                      <p className="text-[9px] text-gray-500 ml-2">
                        {new Date(c.lastTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB: KYC VERIFICATION ─────────────────── */}
          {activeTab === 'kyc' && (
            <div className="h-full flex flex-col gap-3">
              {/* Filter Tabs */}
              <div className="flex gap-2 flex-shrink-0">
                {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => { setKycFilter(f); fetchKycSubmissions(f); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      kycFilter === f ? 'bg-accent/15 text-accent' : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    {f === 'pending' && kycCounts.pending > 0 && (
                      <span className="ml-1 px-1 py-0.5 rounded-full bg-orange-500 text-[8px] text-white">{kycCounts.pending}</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                {kycSubmissions.length === 0 ? (
                  <div className="glass-card p-8 text-center">
                    <BadgeCheck size={32} className="mx-auto text-gray-600 mb-2" />
                    <p className="text-xs text-gray-500">No {kycFilter !== 'all' ? kycFilter : ''} submissions</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {kycSubmissions.map(kyc => {
                      const isViewing = kycViewingId === kyc.id;
                      return (
                        <div key={kyc.id} className="glass-card p-4 space-y-3">
                        {/* Header Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              kyc.status === 'pending' ? 'bg-yellow-400' : kyc.status === 'approved' ? 'bg-green-400' : 'bg-red-400'
                            }`} />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate">{kyc.userName}</p>
                              <p className="text-[10px] text-gray-400 truncate">{kyc.userEmail} &middot; UID: {kyc.userUid}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              kyc.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              kyc.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {kyc.status.toUpperCase()}
                            </span>
                            <button
                              onClick={() => setKycViewingId(isViewing ? null : kyc.id)}
                              className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400"
                              title={isViewing ? 'Collapse' : 'View details'}
                            >
                              <Eye size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Summary Row */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400">
                          <span>Doc: <span className="text-white capitalize">{kyc.documentType.replace('_', ' ')}</span></span>
                          <span>Name: <span className="text-white">{kyc.fullName}</span></span>
                          <span>DOB: <span className="text-white">{kyc.dateOfBirth}</span></span>
                          <span>Submitted: <span className="text-white">{new Date(kyc.submittedAt).toLocaleDateString()}</span></span>
                        </div>

                        {/* Expanded View */}
                        {isViewing && (
                          <div className="space-y-3 pt-2 border-t border-white/10">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-[10px] text-gray-400 mb-0.5">Nationality</p>
                                <p className="text-white">{kyc.nationality}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 mb-0.5">Document #</p>
                                <p className="text-white font-mono">{kyc.documentNumber}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-[10px] text-gray-400 mb-0.5">Address</p>
                                <p className="text-white">{kyc.address}</p>
                              </div>
                            </div>

                            {/* Document Images */}
                            <div>
                              <p className="text-[10px] text-gray-400 mb-1.5 font-semibold">Uploaded Documents</p>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <p className="text-[9px] text-gray-500 mb-1">Front</p>
                                  <img
                                    src={kyc.documentFrontImage} alt="Front"
                                    className="w-full h-20 object-cover rounded-lg border border-white/10 cursor-pointer hover:border-accent/50"
                                    onClick={() => setKycImageModal(kyc.documentFrontImage)}
                                  />
                                </div>
                                {kyc.documentBackImage && (
                                  <div>
                                    <p className="text-[9px] text-gray-500 mb-1">Back</p>
                                    <img
                                      src={kyc.documentBackImage} alt="Back"
                                      className="w-full h-20 object-cover rounded-lg border border-white/10 cursor-pointer hover:border-accent/50"
                                      onClick={() => setKycImageModal(kyc.documentBackImage!)}
                                    />
                                  </div>
                                )}
                                <div>
                                  <p className="text-[9px] text-gray-500 mb-1">Selfie</p>
                                  <img
                                    src={kyc.selfieImage} alt="Selfie"
                                    className="w-full h-20 object-cover rounded-lg border border-white/10 cursor-pointer hover:border-accent/50"
                                    onClick={() => setKycImageModal(kyc.selfieImage)}
                                  />
                                </div>
                              </div>
                            </div>

                            {kyc.rejectionReason && (
                              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                <p className="text-[10px] text-red-400">Rejection Reason: {kyc.rejectionReason}</p>
                              </div>
                            )}

                            {/* Action Buttons */}
                            {kyc.status === 'pending' && (
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => handleKycAction(kyc.id, 'approve')}
                                  className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                                >
                                  <CheckCircle2 size={14} /> Approve
                                </button>
                                {kycShowRejectInput === kyc.id ? (
                                  <div className="flex-1 flex gap-1">
                                    <input
                                      type="text"
                                      value={kycRejectReason}
                                      onChange={e => setKycRejectReason(e.target.value)}
                                      placeholder="Reason (optional)"
                                      className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs"
                                    />
                                    <button
                                      onClick={() => handleKycAction(kyc.id, 'reject', kycRejectReason)}
                                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setKycShowRejectInput(kyc.id)}
                                    className="flex-1 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 border border-red-600/30"
                                  >
                                    <XCircle size={14} /> Reject
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Image Preview Modal */}
              {kycImageModal && (
                <div
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                  onClick={() => setKycImageModal(null)}
                >
                  <div className="relative max-w-2xl max-h-[85vh]" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setKycImageModal(null)}
                      className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-[var(--admin-panel)] border border-[var(--admin-border)] flex items-center justify-center z-10 hover:bg-white/10"
                    >
                      <XIcon size={14} />
                    </button>
                    <img src={kycImageModal} alt="Document" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: SETTINGS ─────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="h-full flex flex-col gap-3">
              <div className="flex items-center justify-between flex-shrink-0">
                <h3 className="text-sm font-bold">Admin Settings</h3>
                <button
                  onClick={handleSaveAdminSettings}
                  className="px-3 py-1.5 rounded bg-accent text-black text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>

              {settingsLoading || !adminSettings ? (
                <div className="glass-card p-4 text-xs text-gray-500">Loading settings...</div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
                  <div className="grid lg:grid-cols-2 gap-3">
                    {/* RBAC */}
                    <div className="glass-card p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold">Role-Based Access Control</p>
                        <label className="flex items-center gap-2 text-[10px] text-gray-400">
                          <input
                            type="checkbox"
                            checked={adminSettings.rbacEnabled}
                            onChange={(e) => setAdminSettings(s => s ? { ...s, rbacEnabled: e.target.checked } : s)}
                            className="accent-accent"
                          />
                          Enable RBAC
                        </label>
                      </div>
                      <div className="space-y-1 text-[10px]">
                        {adminSettings.roles.map(role => (
                          <div key={role.name} className="p-2 rounded bg-white/5">
                            <p className="font-semibold">{role.name}</p>
                            <p className="text-gray-400">{role.permissions.join(', ')}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Security */}
                    <div className="glass-card p-3 space-y-2">
                      <p className="text-xs font-semibold">Security Settings</p>
                      <label className="flex items-center gap-2 text-[10px] text-gray-400">
                        <input
                          type="checkbox"
                          checked={adminSettings.security.require2fa}
                          onChange={(e) => setAdminSettings(s => s ? { ...s, security: { ...s.security, require2fa: e.target.checked } } : s)}
                          className="accent-accent"
                        />
                        Require 2FA for admins
                      </label>
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">IP Whitelist (one per line)</label>
                        <textarea
                          value={ipWhitelistInput}
                          onChange={(e) => setIpWhitelistInput(e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5 min-h-[70px]"
                        />
                      </div>
                    </div>

                    {/* System Notifications */}
                    <div className="glass-card p-3 space-y-2">
                      <p className="text-xs font-semibold">System Notifications</p>
                      {(['newUsers', 'largeWithdrawals', 'flaggedTrades'] as const).map(key => (
                        <label key={key} className="flex items-center gap-2 text-[10px] text-gray-400">
                          <input
                            type="checkbox"
                            checked={adminSettings.notifications[key]}
                            onChange={(e) => setAdminSettings(s => s ? { ...s, notifications: { ...s.notifications, [key]: e.target.checked } } : s)}
                            className="accent-accent"
                          />
                          {key === 'newUsers' ? 'New users' : key === 'largeWithdrawals' ? 'Large withdrawals' : 'Flagged trades'}
                        </label>
                      ))}
                      <div className="pt-1">
                        <label className="block text-[10px] text-gray-400 mb-0.5">Theme</label>
                        <select
                          value={adminTheme}
                          onChange={(e) => handleThemeChange(e.target.value as 'dark' | 'light')}
                          className="w-full text-xs rounded px-2 py-1.5 border"
                        >
                          <option value="dark">Dark</option>
                          <option value="light">Light</option>
                        </select>
                      </div>
                    </div>

                    {/* Maintenance Mode */}
                    <div className="glass-card p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold">Maintenance Mode</p>
                        <label className="flex items-center gap-2 text-[10px] text-gray-400">
                          <input
                            type="checkbox"
                            checked={adminSettings.maintenance.enabled}
                            onChange={(e) => setAdminSettings(s => s ? { ...s, maintenance: { ...s.maintenance, enabled: e.target.checked } } : s)}
                            className="accent-accent"
                          />
                          Enabled
                        </label>
                      </div>
                      <input
                        value={adminSettings.maintenance.message}
                        onChange={(e) => setAdminSettings(s => s ? { ...s, maintenance: { ...s.maintenance, message: e.target.value } } : s)}
                        className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5"
                        placeholder="Maintenance message"
                      />
                    </div>

                    {/* Activity Logs */}
                    <div className="glass-card p-3 space-y-2 lg:col-span-2">
                      <p className="text-xs font-semibold">Activity Logs</p>
                      <div className="max-h-40 overflow-y-auto pr-1 text-[10px]">
                        {auditLogsLoading ? (
                          <p className="text-gray-500">Loading logs...</p>
                        ) : auditLogs.length === 0 ? (
                          <p className="text-gray-500">No recent activity</p>
                        ) : (
                          <div className="space-y-1">
                            {auditLogs.slice(0, 15).map(log => (
                              <div key={log.id} className="flex items-center justify-between p-2 rounded bg-white/5">
                                <div className="min-w-0">
                                  <p className="font-semibold truncate">
                                    {log.userName || log.userEmail || log.userId}
                                  </p>
                                  <p className="text-gray-400 truncate">
                                    {(log.actionType || 'action').split('_').join(' ')} · {log.action.toUpperCase()} {Number(log.amount || 0).toLocaleString()} · {log.reason}
                                  </p>
                                </div>
                                <div className="text-[9px] text-gray-500 text-right flex-shrink-0">
                                  <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                                  <div>{new Date(log.createdAt).toLocaleTimeString()}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* Account Action Modal */}
          {showAccountActionModal && (
            <div
              className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
              onClick={() => setShowAccountActionModal(false)}
            >
              <div
                className="glass-card w-full max-w-lg p-4 space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">Account Action</h3>
                  <button
                    onClick={() => setShowAccountActionModal(false)}
                    className="p-1 rounded hover:bg-white/10"
                  >
                    <XIcon size={14} />
                  </button>
                </div>

                <div className="text-[10px] text-gray-500">
                  {selectedUserIds.length > 0
                    ? `Applying to ${selectedUserIds.length} selected users`
                    : 'Select a user to apply action'}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">User</label>
                    <select
                      value={balanceUserId} onChange={e => setBalanceUserId(e.target.value)}
                      disabled={selectedUserIds.length > 0}
                      className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5 disabled:opacity-50"
                    >
                      <option value="">Select user</option>
                      {filteredUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name || u.email} {u.uid ? `(${u.uid})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Action</label>
                    <select
                      value={balanceAction} onChange={e => setBalanceAction(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5"
                    >
                      <option value="increase">+ Increase</option>
                      <option value="decrease">- Decrease</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] text-gray-400 mb-0.5">Amount (USDT)</label>
                    <input
                      type="number" min="0" value={balanceAmount}
                      onChange={e => setBalanceAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">Reason (required)</label>
                  <textarea
                    value={balanceReason}
                    onChange={e => setBalanceReason(e.target.value)}
                    placeholder="Audit reason for this change"
                    className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5 min-h-[70px]"
                  />
                </div>

                <div className="text-[10px] text-gray-400 space-y-1">
                  <div className="font-semibold text-gray-300">Preview</div>
                  {!previewTargets.length && (
                    <div>Select user(s) and enter amount to preview.</div>
                  )}
                  {previewRows.map(row => (
                    <div key={row.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{row.name}</span>
                      <span className="font-mono">
                        {row.oldBalance.toLocaleString()} → {row.newBalance.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {previewMoreCount > 0 && (
                    <div className="text-[10px] text-gray-500">+ {previewMoreCount} more</div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => { setBalanceReason(''); setShowAccountActionModal(false); }}
                    className="px-3 py-1.5 rounded bg-white/5 text-gray-400 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdjustBalance}
                    disabled={
                      (!selectedUserIds.length && !balanceUserId) ||
                      !balanceAmount ||
                      Number.isNaN(parsedBalanceAmount) ||
                      parsedBalanceAmount <= 0 ||
                      balanceReason.trim().length < 3
                    }
                    className="px-3 py-1.5 bg-accent text-black text-xs font-bold rounded disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
