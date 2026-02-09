'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import {
  Shield, RefreshCw, Users, TrendingUp, Clock, AlertCircle,
  Plus, Minus, MessageCircle, Send, Paperclip, X as XIcon,
  Trash2, LogOut, Home, Bell, Settings, BarChart3, ChevronRight,
  BadgeCheck, Eye, XCircle, CheckCircle2, Sun, Moon,
  type LucideIcon,
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

const NAV_ITEMS: { key: AdminTab; label: string; icon: typeof Shield; permissions: AdminPermission[] }[] = [
  { key: 'overview', label: 'Overview', icon: BarChart3, permissions: ['view_dashboard'] },
  { key: 'trades', label: 'Trade Control', icon: TrendingUp, permissions: ['manage_trades'] },
  { key: 'users', label: 'Accounts', icon: Users, permissions: ['manage_users', 'view_dashboard'] },
  { key: 'kyc', label: 'KYC Verification', icon: BadgeCheck, permissions: ['manage_kyc'] },
  { key: 'chat', label: 'Customer Chat', icon: MessageCircle, permissions: ['manage_support'] },
  { key: 'settings', label: 'Settings', icon: Settings, permissions: ['manage_settings', 'manage_admins', 'view_logs'] },
];

function OverviewKpiCard({
  label,
  value,
  valueClassName = '',
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="glass-card h-[102px] px-4 py-3 md:px-5 md:py-4 flex flex-col items-center justify-center text-center border border-[var(--admin-border)] shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
      <p className="text-[11px] font-medium text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold leading-tight ${valueClassName}`}>{value}</p>
    </div>
  );
}

interface OverviewScrollCardProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  ariaLabel?: string;
}

function OverviewScrollCard({
  title,
  icon: Icon,
  children,
  action,
  className = '',
  bodyClassName = '',
  ariaLabel,
}: OverviewScrollCardProps) {
  return (
    <section className={`glass-card p-4 md:p-5 flex flex-col overflow-hidden border border-[var(--admin-border)] shadow-[0_10px_28px_rgba(0,0,0,0.2)] ${className}`}>
      <header className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--admin-border)] flex-shrink-0">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Icon size={14} className="text-accent" /> {title}
        </h3>
        {action ? <div className="text-xs">{action}</div> : null}
      </header>
      <div
        tabIndex={0}
        aria-label={ariaLabel || title}
        className={`mt-3 flex-1 min-h-0 overflow-y-auto pr-1.5 overview-scroll rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${bodyClassName}`}
      >
        {children}
      </div>
    </section>
  );
}

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
  const [notificationsUnread, setNotificationsUnread] = useState(0);
  const [notificationsSeenAt, setNotificationsSeenAt] = useState('');

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
    ? NAV_ITEMS.filter(item => item.permissions.some(permission => can(permission)))
    : NAV_ITEMS;

  const applyNotificationPayload = useCallback((payload: any) => {
    const nextNotifications: Notification[] = payload?.notifications || [];
    setNotifications(nextNotifications);
    setNotificationsUnread(typeof payload?.unreadCount === 'number' ? payload.unreadCount : nextNotifications.length);
    setNotificationsSeenAt(typeof payload?.lastSeenAt === 'string' ? payload.lastSeenAt : '');
  }, []);

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
            .then(d => { if (d) applyNotificationPayload(d); })
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
  }, [headers, applyNotificationPayload]);

  // Poll notifications every 15s
  useEffect(() => {
    if (!isAuthenticated || !can('view_dashboard')) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/notifications', { headers: headers() });
        if (res.ok) { const d = await res.json(); applyNotificationPayload(d); }
      } catch { /* silent */ }
    }, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, headers, can, applyNotificationPayload]);

  useEffect(() => {
    setSelectedUserIds(prev => prev.filter(id => userBalances.some(u => u.id === id)));
  }, [userBalances]);

  useEffect(() => {
    if (adminPermissions.length === 0) return;
    if (!visibleNavItems.some(item => item.key === activeTab)) {
      setActiveTab(visibleNavItems[0]?.key || 'overview');
    }
  }, [adminPermissions.length, activeTab, visibleNavItems]);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const prevOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const onDesktop = () => {
      if (mediaQuery.matches) {
        setMobileNavOpen(false);
      }
    };
    onDesktop();
    mediaQuery.addEventListener('change', onDesktop);
    return () => mediaQuery.removeEventListener('change', onDesktop);
  }, []);

  const unreadNotifCount = notificationsUnread;

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
  const normalizedAuditQuery = auditLogQuery.trim().toLowerCase();
  const filteredAuditLogs = auditLogs.filter(log => {
    if (!normalizedAuditQuery) return true;
    const haystack = [
      log.actorName,
      log.actorRole,
      log.actionType,
      log.action,
      log.reason,
      log.userName,
      log.userEmail,
      log.userId,
      log.targetType,
      log.targetId,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedAuditQuery);
  });
  const showSettingsControls = can('manage_settings');
  const showAdminManagement = can('manage_admins');
  const showAuditLogs = can('view_logs');
  const isModerator = adminProfile?.role === 'moderator';
  const canManageUsers = !isModerator && can('manage_users');
  const canViewUsers = canManageUsers || isModerator || can('view_dashboard');
  const canBalanceAction = !isModerator && can('manage_financials');
  const canBanAction = canManageUsers;
  const canAccountAction = canBalanceAction || canBanAction;
  const canToggleAdminTheme = !isModerator;

  useEffect(() => {
    if (accountActionType === 'balance' && !canBalanceAction && canBanAction) {
      setAccountActionType('ban');
    }
    if (accountActionType === 'ban' && !canBanAction && canBalanceAction) {
      setAccountActionType('balance');
    }
  }, [accountActionType, canBalanceAction, canBanAction]);

  const handleMarkNotificationsRead = async () => {
    const latestTimestamp = notifications[0]?.timestamp || new Date().toISOString();
    setNotificationsUnread(0);
    setNotificationsSeenAt(latestTimestamp);
    setShowNotifications(false);
    try {
      const markReadRes = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ seenAt: latestTimestamp }),
      });
      if (markReadRes.ok) {
        const payload = await markReadRes.json();
        if (typeof payload?.lastSeenAt === 'string') {
          setNotificationsSeenAt(payload.lastSeenAt);
        }
      }

      const refreshRes = await fetch('/api/admin/notifications', { headers: headers() });
      if (refreshRes.ok) {
        const payload = await refreshRes.json();
        applyNotificationPayload(payload);
      }
    } catch {
      // Keep optimistic UI state even if this request fails.
    }
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
    if (!canToggleAdminTheme) return;
    setAdminTheme(theme);
    setAdminProfile(prev => prev ? { ...prev, uiTheme: theme } : prev);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('coincap-theme', theme);
      const root = document.documentElement;
      root.classList.remove('theme-dark', 'theme-light');
      root.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark');
    }
    try {
      await fetch('/api/admin/session', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ uiTheme: theme }),
      });
    } catch { /* silent */ }
  };

  const handleAdminLogout = () => {
    setIsAuthenticated(false);
    setAdminKey('');
    setMobileNavOpen(false);
    setShowNotifications(false);
  };

  const handleSaveAdminSettings = async () => {
    if (!can('manage_settings')) {
      setError('You do not have permission to update settings');
      return;
    }
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
      if (auditLogsOpen) fetchAuditLogs('all');
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
    if (!can('manage_support')) return;
    try {
      const r = await fetch('/api/admin/chat', { headers: headers() });
      if (r.ok) { const d = await r.json(); setChatConversations(d.conversations || []); }
    } catch { /* silent */ }
  }, [headers, can]);

  const fetchChatMessages = useCallback(async (userId: string) => {
    if (!can('manage_support')) return;
    try {
      const r = await fetch(`/api/admin/chat?userId=${userId}`, { headers: headers() });
      if (r.ok) {
        const d = await r.json();
        setChatMessages(d.messages || []);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    } catch { /* silent */ }
  }, [headers, can]);

  const openChat = (userId: string) => {
    setActiveChatUser(userId);
    setChatMessages([]); setChatInput(''); setChatAttachments([]);
    fetchChatMessages(userId);
  };

  const sendAdminMessage = async () => {
    if (!can('manage_support')) {
      setError('You do not have permission to manage support');
      return;
    }
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
    if (!can('manage_support')) return;
    try {
      const r = await fetch(`/api/admin/chat?messageId=${messageId}`, { method: 'DELETE', headers: headers() });
      if (r.ok) setChatMessages(prev => prev.filter(m => m._id !== messageId));
    } catch { /* silent */ }
  };

  const deleteConversation = async (userId: string) => {
    if (!can('manage_support')) return;
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
    if (!can('manage_kyc')) return;
    try {
      const filter = status || kycFilter;
      const r = await fetch(`/api/admin/kyc?status=${filter}`, { headers: headers() });
      if (r.ok) {
        const d = await r.json();
        setKycSubmissions(d.submissions || []);
        setKycCounts(d.counts || { pending: 0, approved: 0, rejected: 0 });
      }
    } catch { /* silent */ }
  }, [headers, kycFilter, can]);

  const handleKycAction = async (kycId: string, action: 'approve' | 'reject', reason?: string) => {
    if (!can('manage_kyc')) {
      setError('You do not have permission to manage KYC');
      return;
    }
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
      <div className={`min-h-[100dvh] admin-theme ${adminTheme === 'light' ? 'light' : ''} bg-[var(--admin-bg)] flex items-center justify-center p-4`}>
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
  const renderSidebarItems = (onSelect?: () => void) => (
    visibleNavItems.map(item => {
      const Icon = item.icon;
      const isActive = activeTab === item.key;
      const badge = item.key === 'chat' && chatUnread > 0 ? chatUnread
        : item.key === 'kyc' && kycCounts.pending > 0 ? kycCounts.pending : 0;

      return (
        <button
          key={item.key}
          onClick={() => {
            setActiveTab(item.key);
            onSelect?.();
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${
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
    })
  );

  // ══════════════════════════════════════════════════════
  // MAIN ADMIN PANEL
  // ══════════════════════════════════════════════════════
  return (
    <div className={`admin-shell admin-theme ${adminTheme === 'light' ? 'light' : ''} bg-[var(--admin-bg)]`}>
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden lg:flex lg:flex-col admin-sidebar admin-panel">
        <div className="p-4 border-b border-[var(--admin-border)] flex items-center gap-2">
          <Shield size={20} className="text-accent" />
          <h1 className="text-sm font-bold">Admin Panel</h1>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto p-2 space-y-0.5">
          {renderSidebarItems()}
        </nav>
        <div className="mt-auto shrink-0 p-3 border-t border-[var(--admin-border)] space-y-1.5">
          <a
            href="/"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Home size={16} />
            <span>Back to Site</span>
          </a>
          <button
            onClick={handleAdminLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="admin-main">
        {/* Top Bar */}
        <header className="admin-header flex items-center justify-between px-3 sm:px-4 admin-panel">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
              aria-label="Open admin navigation menu"
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
            <button
              onClick={() => handleThemeChange(adminTheme === 'dark' ? 'light' : 'dark')}
              disabled={!canToggleAdminTheme}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={canToggleAdminTheme ? (adminTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode') : 'Moderators have monitor-only access'}
            >
              {adminTheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
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
                <div className="absolute right-0 top-full mt-1 w-80 max-h-96 overflow-y-auto bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-xl shadow-2xl z-50">
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
                      const isUnread = !notificationsSeenAt || new Date(n.timestamp) > new Date(notificationsSeenAt);
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
          </div>
        </header>

        {/* Mobile Nav Drawer */}
        <div
          className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 lg:hidden ${
            mobileNavOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={() => setMobileNavOpen(false)}
          aria-hidden={!mobileNavOpen}
        />
        <aside
          className={`fixed inset-y-0 left-0 z-50 h-dvh w-[80vw] max-w-[280px] border-r border-[var(--admin-border)] bg-[var(--admin-bg)] flex flex-col transform transition-transform duration-300 ease-out lg:hidden ${
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-hidden={!mobileNavOpen}
        >
          <div className="h-16 px-4 border-b border-[var(--admin-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-accent" />
              <h1 className="text-sm font-semibold">Admin Panel</h1>
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
              aria-label="Close menu"
            >
              <XIcon size={16} />
            </button>
          </div>
          <nav className="flex-1 min-h-0 overflow-y-auto p-2 space-y-0.5">
            {renderSidebarItems(() => setMobileNavOpen(false))}
          </nav>
          <div className="mt-auto shrink-0 p-3 border-t border-[var(--admin-border)] space-y-1.5">
            <a
              href="/"
              onClick={() => setMobileNavOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Home size={16} />
              <span>Back to Site</span>
            </a>
            <button
              onClick={handleAdminLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="admin-content">
          <div className="admin-content-inner flex min-h-0 flex-col gap-4">
            {error && <div className="p-2.5 rounded-lg bg-danger/20 text-danger text-xs">{error}</div>}
            {success && <div className="p-2.5 rounded-lg bg-success/20 text-success text-xs">{success}</div>}
            <div className="min-h-0 flex-1">

          {/* ── TAB: OVERVIEW ─────────────────────────── */}
          {activeTab === 'overview' && (
            <section className="w-full max-w-[1400px] mx-auto px-3 md:px-4 xl:px-6 pb-1">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <OverviewKpiCard label="Total Trades" value={stats?.totalTrades ?? 0} />
                  <OverviewKpiCard label="Pending" value={stats?.pendingTrades ?? 0} valueClassName="text-yellow-400" />
                  <OverviewKpiCard label="Wins" value={stats?.wins ?? 0} valueClassName="text-green-400" />
                  <OverviewKpiCard label="Losses" value={stats?.losses ?? 0} valueClassName="text-red-400" />
                  <OverviewKpiCard label="Registered Users" value={userBalances.length} valueClassName="text-accent" />
                  <OverviewKpiCard label="Open Chats" value={chatConversations.length} valueClassName="text-purple-400" />
                  <OverviewKpiCard
                    label="Current Mode"
                    value={(settings?.globalMode?.replace('_', ' ') || '\u2014').replace(/\b\w/g, char => char.toUpperCase())}
                    valueClassName="text-lg md:text-xl"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <OverviewScrollCard
                    title="Recent Registrations"
                    icon={Bell}
                    className="h-[300px] md:h-[360px] xl:h-[390px]"
                    ariaLabel="Recent registrations"
                  >
                    {notifications.length === 0 ? (
                      <p className="text-sm text-gray-500 italic px-2 py-3">No recent registrations</p>
                    ) : (
                      <div className="space-y-2">
                        {notifications.slice(0, 25).map(n => (
                          <article key={n.id} className="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-[var(--admin-border)] transition-colors">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{n.name}</p>
                              <p className="text-xs text-gray-400 truncate">{n.email}</p>
                            </div>
                            <time className="text-[11px] text-gray-500 shrink-0">
                              {new Date(n.timestamp).toLocaleDateString()}
                            </time>
                          </article>
                        ))}
                      </div>
                    )}
                  </OverviewScrollCard>

                  <OverviewScrollCard
                    title="Online Admins"
                    icon={Shield}
                    className="h-[300px] md:h-[360px] xl:h-[390px]"
                    ariaLabel="Online admins"
                  >
                    {onlineAdmins.length === 0 ? (
                      <p className="text-sm text-gray-500 italic px-2 py-3">No active admins</p>
                    ) : (
                      <div className="space-y-2">
                        {onlineAdmins.slice(0, 25).map(a => (
                          <article key={a.id} className="group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-[var(--admin-border)] transition-colors">
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 text-sm font-medium truncate">
                                <span className={`w-2 h-2 rounded-full ${
                                  a.status === 'online' ? 'bg-green-400' :
                                  a.status === 'idle' ? 'bg-yellow-400' : 'bg-gray-500'
                                }`} />
                                {a.name}
                              </p>
                              <p className="text-xs text-gray-400 truncate">{a.role} · {a.email}</p>
                            </div>
                            <div className="text-right text-[11px] text-gray-500 shrink-0">
                              <p>{a.statusLabel}</p>
                              {a.lastActiveAt && <p>{new Date(a.lastActiveAt).toLocaleTimeString()}</p>}
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </OverviewScrollCard>

                  <OverviewScrollCard
                    title="Recent Trades"
                    icon={Clock}
                    className="h-[300px] md:h-[360px] xl:h-[390px] md:col-span-2 xl:col-span-1"
                    bodyClassName="pr-0"
                    ariaLabel="Recent trades"
                  >
                    {recentTrades.length === 0 ? (
                      <p className="text-sm text-gray-500 italic px-2 py-3">No trades yet</p>
                    ) : (
                      <>
                        <div className="md:hidden space-y-2 pr-1.5">
                          {recentTrades.slice(0, 20).map(t => (
                            <article key={t.id} className="px-3 py-2.5 rounded-lg bg-white/5 border border-transparent hover:border-[var(--admin-border)] hover:bg-white/10 transition-colors">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium truncate">{t.user}</p>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  t.result === 'win' ? 'bg-green-500/20 text-green-400' :
                                  t.result === 'lose' ? 'bg-red-500/20 text-red-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {t.result.toUpperCase()}
                                </span>
                              </div>
                              <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                                <p className="truncate">
                                  <span className={`font-semibold ${t.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                                    {t.type.toUpperCase()}
                                  </span>{' '}
                                  <span className="text-gray-300">{t.cryptoSymbol}</span>
                                </p>
                                <p className="text-gray-300 shrink-0">{t.amount.toLocaleString()}</p>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-1">
                                {new Date(t.createdAt).toLocaleString()}
                              </p>
                            </article>
                          ))}
                        </div>
                        <div className="hidden md:block pr-1.5">
                          <table className="w-full table-fixed text-xs">
                            <thead className="sticky top-0 z-10 bg-[var(--admin-panel)]">
                              <tr className="text-gray-400 border-b border-[var(--admin-border)]">
                                <th scope="col" className="text-left py-2 px-2 w-[34%] font-medium">User</th>
                                <th scope="col" className="text-left py-2 px-2 w-[28%] font-medium">Pair</th>
                                <th scope="col" className="text-right py-2 px-2 w-[18%] font-medium">Amount</th>
                                <th scope="col" className="text-center py-2 px-2 w-[20%] font-medium">Result</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recentTrades.slice(0, 20).map(t => (
                                <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                  <td className="py-2 px-2">
                                    <p className="truncate text-sm">{t.user}</p>
                                    <p className="text-[11px] text-gray-500 truncate">{new Date(t.createdAt).toLocaleTimeString()}</p>
                                  </td>
                                  <td className="py-2 px-2">
                                    <span className={`font-semibold ${t.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                                      {t.type.toUpperCase()}
                                    </span>{' '}
                                    <span className="text-gray-300">{t.cryptoSymbol}</span>
                                  </td>
                                  <td className="py-2 px-2 text-right truncate text-sm">{t.amount.toLocaleString()}</td>
                                  <td className="py-2 px-2 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                      t.result === 'win' ? 'bg-green-500/20 text-green-400' :
                                      t.result === 'lose' ? 'bg-red-500/20 text-red-400' :
                                      'bg-yellow-500/20 text-yellow-400'
                                    }`}>
                                      {t.result.toUpperCase()}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </OverviewScrollCard>
                </div>
              </div>
            </section>
          )}

          {/* ── TAB: TRADE CONTROL ────────────────────── */}
          {activeTab === 'trades' && (
            <section className="flex h-full min-h-0 flex-col gap-3">
              <div className="grid shrink-0 gap-3 lg:grid-cols-2">
                {/* Global Mode */}
                <div className="panel p-3 space-y-2 min-h-[200px] md:min-h-[260px] flex flex-col">
                  <h3 className="text-xs font-bold flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-accent" /> Global Trade Mode
                  </h3>
                  <div className="space-y-2">
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
                <div className="panel p-3 space-y-2 h-[200px] md:h-[260px] flex flex-col">
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
                        <div className="absolute z-10 mt-1 w-full max-h-32 overflow-y-auto rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] shadow-xl">
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
              <div className="panel flex flex-1 min-h-0 flex-col overflow-hidden">
                <div className="panel-header">
                  <h3 className="text-xs font-bold flex items-center gap-1.5">
                    <Clock size={12} className="text-accent" /> All Timed Trades
                  </h3>
                </div>
                {recentTrades.length === 0 ? (
                  <div className="panel-body">
                    <p className="text-xs text-gray-500 italic">No trades yet</p>
                  </div>
                ) : (
                  <div
                    tabIndex={0}
                    aria-label="All timed trades"
                    className="panel-body panel-scroll scrollbar-thin-dark flex-1 min-h-0 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    <table className="w-full table-fixed text-[11px] md:text-xs">
                      <thead className="sticky top-0 z-10 bg-[var(--admin-panel)]">
                        <tr className="text-gray-400 border-b border-white/10">
                          <th className="text-left py-2 pr-2 w-[34%] md:w-[22%]">User</th>
                          <th className="text-left py-2 pr-2 w-[16%] md:w-[10%]">Type</th>
                          <th className="text-left py-2 pr-2 w-[18%] md:w-[10%]">Symbol</th>
                          <th className="text-right py-2 pr-2 w-[18%] md:w-[14%]">Amount</th>
                          <th className="hidden md:table-cell text-center py-2 pr-2 w-[10%]">Period</th>
                          <th className="text-center py-2 pr-2 w-[14%] md:w-[12%]">Result</th>
                          <th className="hidden lg:table-cell text-right py-2 pr-2 w-[12%]">Profit</th>
                          <th className="hidden lg:table-cell text-right py-2 pr-2 w-[20%]">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTrades.map(t => (
                          <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-2 pr-2">
                              <p className="truncate">{t.user}</p>
                              <p className="truncate text-[10px] text-gray-500 lg:hidden">
                                {new Date(t.createdAt).toLocaleTimeString()}
                              </p>
                            </td>
                            <td className={`py-2 pr-2 font-semibold ${t.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                              {t.type.toUpperCase()}
                            </td>
                            <td className="py-2 pr-2 truncate">{t.cryptoSymbol}</td>
                            <td className="py-2 pr-2 text-right truncate">{t.amount.toLocaleString()}</td>
                            <td className="hidden md:table-cell py-2 pr-2 text-center">{t.period}s</td>
                            <td className="py-2 pr-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                                t.result === 'win' ? 'bg-green-500/20 text-green-400' :
                                t.result === 'lose' ? 'bg-red-500/20 text-red-400' :
                                'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {t.result.toUpperCase()}
                              </span>
                            </td>
                            <td className={`hidden lg:table-cell py-2 pr-2 text-right ${t.result === 'win' ? 'text-green-400' : ''}`}>
                              {t.result === 'win' ? `+${t.profitAmount.toLocaleString()}` : '\u2014'}
                            </td>
                            <td className="hidden lg:table-cell py-2 pr-2 text-right text-gray-400">
                              {new Date(t.createdAt).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── TAB: USER MANAGEMENT ──────────────────── */}
          {activeTab === 'users' && canViewUsers && (
            <section className="flex h-full min-h-0 flex-col gap-3">
              {/* Account Actions */}
              <div className="panel p-3 space-y-2 flex-shrink-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-xs font-bold flex items-center gap-1.5">
                    <Users size={12} className="text-accent" /> Account Actions
                  </h3>
                  {canManageUsers ? (
                    <div className="flex items-center gap-1 self-start sm:self-auto">
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
                  ) : (
                    <p className="text-[10px] text-gray-500">Read-only access</p>
                  )}
                </div>
                {!canManageUsers ? (
                  <p className="text-[11px] text-gray-400">Moderators can view accounts but cannot create users, reset passwords, or delete records.</p>
                ) : accountActionMode === 'create' ? (
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
              <div className="panel p-3 flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
                  <h3 className="text-xs font-bold flex items-center gap-1.5">
                    <Users size={12} className="text-accent" /> Account Search
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {canAccountAction && (
                      <button
                        onClick={() => {
                          setAccountActionType(canBalanceAction ? 'balance' : 'ban');
                          setBalanceAction('increase');
                          setBalanceReason('');
                          setBanReason('');
                          setShowAccountActionModal(true);
                        }}
                        className="px-2 py-1 rounded text-[10px] font-semibold bg-accent/20 text-accent"
                      >
                        Account Action
                      </button>
                    )}
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

                <div className="space-y-2 flex-shrink-0">
                  <label className="block text-[10px] text-gray-400 mb-0.5">Search users</label>
                  <input
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search by name, email, or UID"
                    className="w-full bg-gray-800 border border-gray-700 text-xs rounded px-2 py-1.5"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                  <div
                    tabIndex={0}
                    aria-label="Accounts table"
                    className="flex-1 min-h-0 overflow-y-auto mt-2 pr-1 scrollbar-thin-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    <table className="w-full table-fixed text-[11px]">
                      <thead className="sticky top-0 z-10 bg-[var(--admin-panel)]">
                        <tr className="text-gray-400 border-b border-gray-800">
                            {canManageUsers && (
                              <th className="text-left py-1.5 pr-2 w-[8%] md:w-[5%]">
                                <input
                                  type="checkbox"
                                  aria-label="Select all filtered users"
                                  checked={allFilteredSelected}
                                  onChange={toggleSelectAll}
                                  className="h-3 w-3"
                                />
                              </th>
                            )}
                            <th className="text-left py-1.5 pr-2 w-[38%] md:w-[24%]">User</th>
                            <th className="hidden xl:table-cell text-left py-1.5 pr-2 w-[18%]">Email</th>
                            <th className="hidden lg:table-cell text-left py-1.5 pr-2 w-[12%]">UID</th>
                            <th className="hidden md:table-cell text-left py-1.5 pr-2 w-[18%]">Status</th>
                            <th className="text-right py-1.5 pr-2 w-[24%] md:w-[13%]">Balance</th>
                            {canAccountAction && <th className="text-center py-1.5 w-[14%] md:w-[12%]">Quick</th>}
                            {canManageUsers && <th className="text-center py-1.5 w-[14%] md:w-[12%]">Actions</th>}
                          </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(u => (
                          <tr
                            key={u.id}
                            className={`border-b border-gray-800/50 hover:bg-white/5 ${
                              u.accountStatus === 'banned' ? 'bg-red-500/10' : ''
                            }`}
                          >
                              {canManageUsers && (
                                <td className="py-2 pr-2">
                                  <input
                                    type="checkbox"
                                    aria-label={`Select ${u.name || u.email}`}
                                    checked={selectedUserIds.includes(u.id)}
                                    onChange={() => toggleSelectUser(u.id)}
                                    className="h-3 w-3"
                                  />
                                </td>
                              )}
                              <td className="py-2 pr-2">
                                <p className="font-medium truncate">{u.name || '\u2014'}</p>
                                <p className="text-[10px] text-gray-400 truncate xl:hidden">{u.email}</p>
                                <p className="text-[10px] text-gray-500 truncate lg:hidden">{u.uid || '\u2014'}</p>
                              </td>
                              <td className="hidden xl:table-cell py-2 pr-2 text-gray-400 truncate">{u.email}</td>
                              <td className="hidden lg:table-cell py-2 pr-2 text-gray-400 font-mono truncate">{u.uid || '\u2014'}</td>
                              <td className="hidden md:table-cell py-2 pr-2">
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
                              <td className="py-2 pr-2 text-right font-mono text-accent truncate">{u.balance.toLocaleString()}</td>
                              {canAccountAction && (
                                <td className="py-2 text-center">
                                  <div className="flex gap-1 justify-center">
                                    <button
                                      onClick={() => {
                                        setAccountActionType('balance');
                                        setSelectedUserIds([]);
                                        setBalanceUserId(u.id);
                                        setBalanceAction('increase');
                                        setBalanceAmount('1000');
                                        setBalanceReason('');
                                        setBanReason('');
                                        setShowAccountActionModal(true);
                                      }}
                                      disabled={!canBalanceAction}
                                      className="p-1 rounded bg-green-900/40 text-green-400 hover:bg-green-900/70 disabled:opacity-40 disabled:cursor-not-allowed"
                                      title="+1000"
                                    >
                                      <Plus size={12} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setAccountActionType('balance');
                                        setSelectedUserIds([]);
                                        setBalanceUserId(u.id);
                                        setBalanceAction('decrease');
                                        setBalanceAmount('1000');
                                        setBalanceReason('');
                                        setBanReason('');
                                        setShowAccountActionModal(true);
                                      }}
                                      disabled={!canBalanceAction}
                                      className="p-1 rounded bg-red-900/40 text-red-400 hover:bg-red-900/70 disabled:opacity-40 disabled:cursor-not-allowed"
                                      title="-1000"
                                    >
                                      <Minus size={12} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setAccountActionType('ban');
                                        setSelectedUserIds([]);
                                        setBalanceUserId(u.id);
                                        setBanReason('');
                                        setShowAccountActionModal(true);
                                      }}
                                      disabled={!canBanAction}
                                      className="p-1 rounded bg-red-900/20 text-red-300 hover:bg-red-900/40 disabled:opacity-40 disabled:cursor-not-allowed"
                                      title="Ban user"
                                    >
                                      <XCircle size={12} />
                                    </button>
                                  </div>
                                </td>
                              )}
                              {canManageUsers && (
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
                              )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
            </section>
          )}

          {/* ── TAB: CHAT ─────────────────────────────── */}
          {activeTab === 'chat' && (
            <section className="flex h-full min-h-0 flex-col">
            <div className="panel p-3 flex flex-col min-h-0 flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <MessageCircle size={14} className="text-accent" /> Customer Chat
                  {chatUnread > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-danger text-[9px] text-white font-bold">{chatUnread}</span>
                  )}
                </h3>
                <button onClick={fetchConversations} className="text-[10px] text-gray-400 hover:text-white self-start sm:self-auto">
                  <RefreshCw size={12} />
                </button>
              </div>

              {activeChatUser ? (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-white/5 rounded-lg px-3 py-2 flex-shrink-0 mt-2">
                    <div>
                      <p className="text-xs font-bold">
                        {chatConversations.find(c => c.userId === activeChatUser)?.userName || 'User'}
                      </p>
                      <p className="text-[9px] text-gray-400">
                        {chatConversations.find(c => c.userId === activeChatUser)?.userEmail}
                      </p>
                    </div>
                    <div className="flex gap-1.5 self-start sm:self-auto">
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
            </section>
          )}

          {/* ── TAB: KYC VERIFICATION ─────────────────── */}
          {activeTab === 'kyc' && (
            <section className="flex h-full min-h-0 flex-col gap-3">
              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-2 flex-shrink-0">
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                              <div className="flex flex-col sm:flex-row gap-2 pt-1">
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
            </section>
          )}

          {/* ── TAB: SETTINGS ─────────────────────────── */}
          {activeTab === 'settings' && (
            <section className="flex h-full min-h-0 flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
                <h3 className="text-sm font-bold">Admin Settings</h3>
                {showSettingsControls && (
                  <button
                    onClick={handleSaveAdminSettings}
                    className="w-full sm:w-auto px-3 py-1.5 rounded bg-accent text-black text-xs font-semibold"
                  >
                    Save Changes
                  </button>
                )}
              </div>

              {showSettingsControls && (settingsLoading || !adminSettings) ? (
                <div className="panel p-4 text-xs text-gray-500">Loading settings...</div>
              ) : (
                <div className="flex-1 min-h-0">
                  <div className="min-h-0 h-full grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {showSettingsControls && adminSettings && (
                      <div className="min-h-0 flex flex-col gap-3 lg:col-span-1">
                        {/* RBAC */}
                        <div className="panel p-3 min-h-[180px] lg:min-h-0 lg:flex-[1.35] flex flex-col gap-2">
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
                          <div className="space-y-1 text-[10px] flex-1 min-h-0 overflow-y-auto pr-1">
                            {adminSettings.roles.map(role => (
                              <div key={role.name} className="p-2 rounded bg-white/5">
                                <p className="font-semibold">{role.name}</p>
                                <p className="text-gray-400">{role.permissions.join(', ')}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* System Notifications */}
                        <div className="panel p-3 min-h-[120px] lg:min-h-0 lg:flex-[0.85] flex flex-col gap-2">
                          <p className="text-xs font-semibold">System Notifications</p>
                          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
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
                          </div>
                          <p className="text-[10px] text-gray-500">Theme toggle is available in the top-right header.</p>
                        </div>

                        {/* Maintenance Mode */}
                        <div className="panel p-3 min-h-[120px] lg:min-h-0 lg:flex-[0.8] flex flex-col gap-2">
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
                            className="w-full text-xs rounded px-2 py-1.5 border"
                            placeholder="Maintenance message"
                          />
                        </div>
                      </div>
                    )}

                    <div className={`min-h-0 flex flex-col gap-3 ${showSettingsControls && adminSettings ? 'lg:col-span-1' : 'lg:col-span-2'}`}>
                      {/* Admin Management */}
                      {showAdminManagement && (
                        <div className="panel p-3 min-h-[250px] lg:min-h-0 lg:flex-[0.9] flex flex-col gap-2 overflow-hidden">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold">Admin Accounts</p>
                            <span className="text-[10px] text-gray-500">{adminUsers.length} total</span>
                          </div>

                          {newAdminKey && (
                            <div className="p-2 rounded bg-white/5 text-[10px] flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-gray-400 mb-0.5">New admin key (copy once)</p>
                                <p className="font-mono text-accent break-all">{newAdminKey}</p>
                              </div>
                              <button
                                onClick={() => setNewAdminKey(null)}
                                className="text-[10px] text-gray-400 hover:text-white"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}

                          {adminProfile?.role === 'superadmin' ? (
                            <div className="grid md:grid-cols-4 gap-2 items-end">
                              <div className="md:col-span-1">
                                <label className="block text-[10px] text-gray-400 mb-0.5">Name</label>
                                <input
                                  value={newAdminName}
                                  onChange={(e) => setNewAdminName(e.target.value)}
                                  className="w-full text-xs rounded px-2 py-1.5 border"
                                  placeholder="Admin name"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-[10px] text-gray-400 mb-0.5">Email</label>
                                <input
                                  value={newAdminEmail}
                                  onChange={(e) => setNewAdminEmail(e.target.value)}
                                  className="w-full text-xs rounded px-2 py-1.5 border"
                                  placeholder="admin@email.com"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-400 mb-0.5">Role</label>
                                <select
                                  value={newAdminRole}
                                  onChange={(e) => setNewAdminRole(e.target.value as 'admin' | 'moderator')}
                                  className="w-full text-xs rounded px-2 py-1.5 border"
                                >
                                  <option value="admin">Admin</option>
                                  <option value="moderator">Moderator</option>
                                </select>
                              </div>
                              <div className="md:col-span-4">
                                <button
                                  onClick={handleCreateAdmin}
                                  className="px-3 py-1.5 bg-accent text-black text-xs font-bold rounded"
                                >
                                  Create Admin
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] text-gray-500">Only Super Admin can create new admin accounts.</p>
                          )}

                          <div className="flex-1 min-h-0 overflow-y-auto pr-1 text-[10px]">
                            {adminUsersLoading ? (
                              <p className="text-gray-500">Loading admins...</p>
                            ) : adminUsers.length === 0 ? (
                              <p className="text-gray-500">No admins found</p>
                            ) : (
                              <div className="space-y-1">
                                {adminUsers.map(admin => {
                                  const cannotDelete = admin.isRoot || (admin.role === 'superadmin' && adminProfile?.role !== 'superadmin');
                                  return (
                                    <div key={admin.id} className="flex items-center justify-between p-2 rounded bg-white/5">
                                      <div className="min-w-0">
                                        <p className="font-semibold truncate">{admin.name} ({admin.roleLabel})</p>
                                        <p className="text-gray-400 truncate">{admin.email} · •••• {admin.keyLast4}</p>
                                        {admin.createdByName && (
                                          <p className="text-[9px] text-gray-500 truncate">Created by {admin.createdByName}</p>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => {
                                          if (cannotDelete) return;
                                          if (!confirm(`Delete ${admin.name}?`)) return;
                                          handleDeleteAdmin(admin.id);
                                        }}
                                        disabled={cannotDelete}
                                        className="text-[10px] text-danger hover:underline disabled:opacity-40"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Activity Logs */}
                      {showAuditLogs && (
                        <div className="panel min-h-[320px] lg:min-h-0 lg:flex-1 flex flex-col overflow-hidden">
                          <div className="panel-header">
                            <p className="text-xs font-semibold">Activity Logs</p>
                            <input
                              value={auditLogQuery}
                              onChange={(e) => setAuditLogQuery(e.target.value)}
                              placeholder="Search logs"
                              className="w-36 text-[10px] rounded px-2 py-1 border"
                            />
                          </div>
                          <div
                            tabIndex={0}
                            aria-label="Activity logs"
                            className="panel-body panel-scroll scrollbar-thin-dark flex-1 min-h-0 pr-1 text-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                          >
                            {auditLogsLoading ? (
                              <p className="text-gray-500">Loading logs...</p>
                            ) : filteredAuditLogs.length === 0 ? (
                              <p className="text-gray-500">No recent activity</p>
                            ) : (
                              <div className="space-y-1">
                                {filteredAuditLogs.map(log => {
                                  const actorLabel = log.actorName || log.actorRole || 'Admin';
                                  const targetLabel = log.userName || log.userEmail || log.targetId || '—';
                                  const actionLabel = (log.actionType || 'action').split('_').join(' ');
                                  const amountLabel = Number(log.amount || 0) > 0 ? ` · ${Number(log.amount || 0).toLocaleString()}` : '';
                                  return (
                                    <div key={log.id} className="flex items-center justify-between p-2 rounded bg-white/5">
                                      <div className="min-w-0">
                                        <p className="font-semibold truncate">
                                          {actorLabel} {log.actorRole ? `(${log.actorRole})` : ''}
                                        </p>
                                        <p className="text-gray-400 truncate">
                                          {actionLabel} · {log.action?.toUpperCase()}{amountLabel} · {targetLabel}
                                        </p>
                                        {log.reason && (
                                          <p className="text-[9px] text-gray-500 truncate">Reason: {log.reason}</p>
                                        )}
                                      </div>
                                      <div className="text-[9px] text-gray-500 text-right flex-shrink-0">
                                        <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                                        <div>{new Date(log.createdAt).toLocaleTimeString()}</div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Account Action Modal */}
          {showAccountActionModal && canAccountAction && (
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

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAccountActionType('balance')}
                    disabled={!canBalanceAction}
                    className={`px-2.5 py-1 rounded text-[10px] font-semibold ${
                      accountActionType === 'balance'
                        ? 'bg-accent/20 text-accent'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    } ${!canBalanceAction ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    Balance
                  </button>
                  <button
                    onClick={() => setAccountActionType('ban')}
                    disabled={!canBanAction}
                    className={`px-2.5 py-1 rounded text-[10px] font-semibold ${
                      accountActionType === 'ban'
                        ? 'bg-danger/20 text-danger'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    } ${!canBanAction ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    Ban User
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[10px] text-gray-400 mb-0.5">User</label>
                    <select
                      value={balanceUserId} onChange={e => setBalanceUserId(e.target.value)}
                      disabled={selectedUserIds.length > 0}
                      className="w-full text-xs rounded px-2 py-1.5 border disabled:opacity-50"
                    >
                      <option value="">Select user</option>
                      {filteredUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email} {u.uid ? `(${u.uid})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {accountActionType === 'balance' && (
                    <>
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">Action</label>
                        <select
                          value={balanceAction} onChange={e => setBalanceAction(e.target.value)}
                          className="w-full text-xs rounded px-2 py-1.5 border"
                        >
                          <option value="increase">+ Increase</option>
                          <option value="decrease">- Decrease</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">Amount (USDT)</label>
                        <input
                          type="number" min="0" value={balanceAmount}
                          onChange={e => setBalanceAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full text-xs rounded px-2 py-1.5 border"
                        />
                      </div>
                    </>
                  )}
                </div>

                {accountActionType === 'balance' ? (
                  <>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">Reason (required)</label>
                      <textarea
                        value={balanceReason}
                        onChange={e => setBalanceReason(e.target.value)}
                        placeholder="Audit reason for this change"
                        className="w-full text-xs rounded px-2 py-1.5 border min-h-[70px]"
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
                  </>
                ) : (
                  <>
                    <div className="rounded border border-danger/30 bg-danger/10 p-2 text-[10px] text-danger">
                      Banned users will be unable to log in. This action is recorded in the audit log.
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">Ban reason (required)</label>
                      <textarea
                        value={banReason}
                        onChange={e => setBanReason(e.target.value)}
                        placeholder="Reason for banning this user"
                        className="w-full text-xs rounded px-2 py-1.5 border min-h-[70px]"
                      />
                    </div>
                    {previewTargets.length > 0 && (
                      <div className="text-[10px] text-gray-400 space-y-1">
                        <div className="font-semibold text-gray-300">Targets</div>
                        {previewTargets.slice(0, 3).map(u => (
                          <div key={u.id} className="truncate">{u.name || u.email}</div>
                        ))}
                        {previewTargets.length > 3 && (
                          <div className="text-[10px] text-gray-500">+ {previewTargets.length - 3} more</div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setBalanceReason('');
                      setBanReason('');
                      setShowAccountActionModal(false);
                    }}
                    className="px-3 py-1.5 rounded bg-white/5 text-gray-400 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={accountActionType === 'balance' ? handleAdjustBalance : handleBanUsers}
                    disabled={accountActionType === 'balance'
                      ? (
                        (!selectedUserIds.length && !balanceUserId) ||
                        !balanceAmount ||
                        Number.isNaN(parsedBalanceAmount) ||
                        parsedBalanceAmount <= 0 ||
                        balanceReason.trim().length < 3
                      )
                      : (
                        (!selectedUserIds.length && !balanceUserId) ||
                        banReason.trim().length < 3
                      )
                    }
                    className="px-3 py-1.5 bg-accent text-black text-xs font-bold rounded disabled:opacity-40"
                  >
                    {accountActionType === 'balance' ? 'Apply' : 'Ban'}
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
