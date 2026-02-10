'use client';

import { Home, ArrowLeftRight, Wallet, Menu, X, User, BarChart3, Bell, Newspaper, Eye, EyeOff, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef, type UIEvent } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { SessionProvider, useSession } from 'next-auth/react';
import ChatWidget from '@/lib/components/ChatWidget';

interface RootLayoutClientProps {
  children: React.ReactNode;
  locale: string;
  messages: any;
}

type AppTheme = 'dark' | 'light';
const THEME_STORAGE_KEY = 'coincap-theme';
const PORTFOLIO_VISIBILITY_STORAGE_KEY = 'coincap-hide-portfolio-value';

type UserNotification = {
  id: string;
  type: 'funding' | 'system' | 'promotion' | string;
  title: string;
  message: string;
  timestamp: string;
  targetPath?: string;
  status?: string;
  fundingType?: 'deposit' | 'withdraw';
};

function applyThemeClass(theme: AppTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove('theme-dark', 'theme-light');
  root.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark');
}

function RootLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { status } = useSession();
  const [portfolioValue, setPortfolioValue] = useState<string | null>(null);
  const [appTheme, setAppTheme] = useState<AppTheme>('dark');
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);
  const [userNotificationsUnread, setUserNotificationsUnread] = useState(0);
  const [userNotificationsSeenAt, setUserNotificationsSeenAt] = useState('');
  const [showUserNotifications, setShowUserNotifications] = useState(false);
  const [showPortfolioValue, setShowPortfolioValue] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const mainContentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const hidePortfolioValue = window.localStorage.getItem(PORTFOLIO_VISIBILITY_STORAGE_KEY) === '1';
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const nextTheme: AppTheme =
      storedTheme === 'light' || storedTheme === 'dark'
        ? storedTheme
        : prefersLight
          ? 'light'
          : 'dark';
    setAppTheme(nextTheme);
    setShowPortfolioValue(!hidePortfolioValue);
    applyThemeClass(nextTheme);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const handleThemeChange = (event: MediaQueryListEvent) => {
      const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme === 'light' || storedTheme === 'dark') return;
      const nextTheme: AppTheme = event.matches ? 'light' : 'dark';
      setAppTheme(nextTheme);
      applyThemeClass(nextTheme);
    };
    media.addEventListener('change', handleThemeChange);
    return () => media.removeEventListener('change', handleThemeChange);
  }, []);

  useEffect(() => {
    applyThemeClass(appTheme);
  }, [appTheme]);
  
  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.portfolio?.accountBalance != null) {
        const total = (data.portfolio.accountBalance ?? 0) +
          (data.portfolio.holdings ?? []).reduce((sum: number, h: any) => sum + (h.totalValue ?? 0), 0);
        setPortfolioValue(total.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
      }
    } catch (error) {
      console.error('[RootLayout] Failed to load dashboard', error);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboardData();
    }
  }, [status, fetchDashboardData]);

  const fetchUserNotifications = useCallback(async () => {
    if (status !== 'authenticated') return;
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      if (!res.ok) return;
      const payload = await res.json();
      const notifications: UserNotification[] = payload?.notifications || [];
      setUserNotifications(notifications);
      setUserNotificationsUnread(
        typeof payload?.unreadCount === 'number' ? payload.unreadCount : notifications.length
      );
      setUserNotificationsSeenAt(typeof payload?.lastSeenAt === 'string' ? payload.lastSeenAt : '');
    } catch (error) {
      console.error('[RootLayout] Failed to load user notifications', error);
    }
  }, [status]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchUserNotifications();
    } else {
      setUserNotifications([]);
      setUserNotificationsUnread(0);
      setUserNotificationsSeenAt('');
      setShowUserNotifications(false);
    }
  }, [status, fetchUserNotifications]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const interval = setInterval(fetchUserNotifications, 15000);
    return () => clearInterval(interval);
  }, [status, fetchUserNotifications]);

  const handleMarkUserNotificationsRead = useCallback(async () => {
    const latestTimestamp = userNotifications[0]?.timestamp || new Date().toISOString();
    setUserNotificationsUnread(0);
    setUserNotificationsSeenAt(latestTimestamp);
    setShowUserNotifications(false);
    try {
      const markReadRes = await fetch('/api/notifications', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seenAt: latestTimestamp }),
      });
      if (markReadRes.ok) {
        const payload = await markReadRes.json();
        if (typeof payload?.lastSeenAt === 'string') {
          setUserNotificationsSeenAt(payload.lastSeenAt);
        }
      }
      fetchUserNotifications();
    } catch {
      // Keep optimistic state on error.
    }
  }, [userNotifications, fetchUserNotifications]);

  const handleUserNotificationClick = useCallback((notification: UserNotification) => {
    setShowUserNotifications(false);
    const targetPath = notification.targetPath || (notification.type === 'funding' ? '/wallet' : '/dashboard');
    router.push(targetPath);
  }, [router]);

  const handleTogglePortfolioValue = useCallback(() => {
    setShowPortfolioValue((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(PORTFOLIO_VISIBILITY_STORAGE_KEY, next ? '0' : '1');
      }
      return next;
    });
  }, []);

  const handleMainScroll = useCallback((event: UIEvent<HTMLElement>) => {
    setShowBackToTop(event.currentTarget.scrollTop > 320);
  }, []);

  const scrollMainToTop = useCallback(() => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  // Check if current page is auth page or admin page (these get their own layout)
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password' || pathname === '/verify-email';
  const isAdminPage = pathname.startsWith('/admin');

  const navItems = [
    { name: 'Home', icon: Home, href: '/' },
    { name: 'Markets', icon: BarChart3, href: '/markets' },
    { name: 'Trade', icon: ArrowLeftRight, href: '/trade' },
    { name: 'News', icon: Newspaper, href: '/news' },
    { name: 'Wallet', icon: Wallet, href: '/wallet' },
  ];

  const accountLink = { name: 'Account', icon: User, href: '/account' };

  if (isAuthPage || isAdminPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:h-full md:flex-col md:w-56 glass border-r border-white/10">
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            CryptoTrade
          </h1>
          <div className="relative">
            <button
              onClick={() => setShowUserNotifications((prev) => !prev)}
              className="relative p-2 rounded-lg hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              title="Notifications"
            >
              <Bell size={18} className="text-gray-300" />
              {userNotificationsUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-[9px] text-white font-bold flex items-center justify-center">
                  {userNotificationsUnread > 9 ? '9+' : userNotificationsUnread}
                </span>
              )}
            </button>
            {showUserNotifications && (
              <div className="menu-surface absolute left-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-white/10 shadow-2xl z-50">
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                  <p className="text-xs font-semibold text-white">Notifications</p>
                  <button onClick={handleMarkUserNotificationsRead} className="text-[10px] text-accent hover:underline">
                    Mark all read
                  </button>
                </div>
                {userNotifications.length === 0 ? (
                  <p className="p-4 text-xs text-gray-500 text-center">No notifications</p>
                ) : (
                  userNotifications.slice(0, 20).map((notification) => {
                    const isUnread = !userNotificationsSeenAt || new Date(notification.timestamp) > new Date(userNotificationsSeenAt);
                    return (
                      <button
                        type="button"
                        key={notification.id}
                        onClick={() => handleUserNotificationClick(notification)}
                        className={`w-full text-left px-3 py-2.5 border-b border-white/5 hover:bg-white/10 transition-colors ${isUnread ? 'bg-accent/5' : ''}`}
                      >
                        <p className="text-xs font-semibold text-white">{notification.title}</p>
                        <p className="text-[11px] text-gray-300 mt-0.5">{notification.message}</p>
                        <p className="text-[10px] text-gray-500 mt-1">{new Date(notification.timestamp).toLocaleString()}</p>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isActive ? 'bg-accent text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-2.5 space-y-1 border-t border-white/10">
          <Link
            href={accountLink.href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              pathname === accountLink.href ? 'bg-accent text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <User size={18} />
            <span className="font-medium text-sm">{accountLink.name}</span>
          </Link>
          
          <div className="glass-card p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-gray-400">Portfolio Value</p>
              <button
                onClick={handleTogglePortfolioValue}
                className="p-1 rounded-md hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={showPortfolioValue ? 'Hide portfolio value' : 'Show portfolio value'}
              >
                {showPortfolioValue ? <EyeOff size={12} className="text-gray-400" /> : <Eye size={12} className="text-gray-400" />}
              </button>
            </div>
            <p className="text-base font-bold">{showPortfolioValue ? (portfolioValue ?? '—') : '••••••'}</p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 glass border-b border-white/10" style={{paddingTop: 'env(safe-area-inset-top)'}}>
        <div className="flex items-center justify-between px-3 py-3">
          <h1 className="text-base font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent truncate">
            CryptoTrade
          </h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowUserNotifications((prev) => !prev)}
                className="relative p-1.5 rounded-lg hover:bg-white/5 active:bg-white/10 min-h-touch min-w-touch flex items-center justify-center transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Open notifications"
              >
                <Bell size={20} />
                {userNotificationsUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-[9px] text-white font-bold flex items-center justify-center">
                    {userNotificationsUnread > 9 ? '9+' : userNotificationsUnread}
                  </span>
                )}
              </button>
              {showUserNotifications && (
                <div className="menu-surface absolute right-0 top-full mt-2 w-[min(90vw,20rem)] max-h-96 overflow-y-auto rounded-xl border border-white/10 shadow-2xl z-50">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                    <p className="text-xs font-semibold text-white">Notifications</p>
                    <button onClick={handleMarkUserNotificationsRead} className="text-[10px] text-accent hover:underline">
                      Mark all read
                    </button>
                  </div>
                  {userNotifications.length === 0 ? (
                    <p className="p-4 text-xs text-gray-500 text-center">No notifications</p>
                  ) : (
                    userNotifications.slice(0, 20).map((notification) => {
                      const isUnread = !userNotificationsSeenAt || new Date(notification.timestamp) > new Date(userNotificationsSeenAt);
                      return (
                        <button
                          type="button"
                          key={notification.id}
                          onClick={() => handleUserNotificationClick(notification)}
                          className={`w-full text-left px-3 py-2.5 border-b border-white/5 hover:bg-white/10 transition-colors ${isUnread ? 'bg-accent/5' : ''}`}
                        >
                          <p className="text-xs font-semibold text-white">{notification.title}</p>
                          <p className="text-[11px] text-gray-300 mt-0.5">{notification.message}</p>
                          <p className="text-[10px] text-gray-500 mt-1">{new Date(notification.timestamp).toLocaleString()}</p>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg hover:bg-white/5 active:bg-white/10 min-h-touch min-w-touch flex items-center justify-center transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[35] bg-black/80 backdrop-blur-sm overflow-y-auto" style={{top: 'calc(60px + env(safe-area-inset-top))'}} onClick={() => setMobileMenuOpen(false)}>
          <div className="menu-surface m-2.5 mt-3 max-h-[calc(100vh-100px)] overflow-y-auto rounded-xl border border-white/10 p-2.5" onClick={(e) => e.stopPropagation()}>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg min-h-touch transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      isActive ? 'bg-accent text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium text-sm">{item.name}</span>
                  </Link>
                );
              })}
              <div className="border-t border-white/10 pt-1">
                <Link
                  href={accountLink.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg min-h-touch transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    pathname === accountLink.href ? 'bg-accent text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <User size={18} />
                  <span className="font-medium text-sm">{accountLink.name}</span>
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main 
        ref={mainContentRef}
        onScroll={handleMainScroll}
        className="flex-1 h-full min-h-0 overflow-y-auto md:pt-0 md:pb-0 mobile-content-padding"
      >
        {children}
      </main>

      {showBackToTop && (
        <button
          onClick={scrollMainToTop}
          className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6 z-[60] w-10 h-10 rounded-full bg-accent text-white shadow-lg hover:bg-accent/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Back to top"
        >
          <ChevronUp size={18} className="mx-auto" />
        </button>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10" style={{paddingBottom: 'env(safe-area-inset-bottom)'}}>
        <div className="flex items-center justify-around px-1 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 min-h-touch min-w-touch rounded-lg transition-smooth ${
                  isActive ? 'text-accent' : 'text-gray-400'
                }`}
              >
                <Icon size={20} />
                <span className="text-[11px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Chat Widget */}
      {!isAuthPage && <ChatWidget />}
    </div>
  );
}

export function RootLayoutClient({
  children,
  locale,
  messages,
}: RootLayoutClientProps) {
  return (
    <SessionProvider>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <RootLayoutContent>{children}</RootLayoutContent>
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
